import { NextRequest } from "next/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { db, userSettings, entries } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { format, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { clerkClient } from "@clerk/nextjs/server";
import { posthogCaptureServer } from "@/lib/posthog";
import { captureServerError } from "@/lib/sentry/server";

const resend = new Resend(process.env.RESEND_API_KEY);

async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 2,
    delayMs: number = 200
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === retries) break;
            await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
    }
    throw lastError;
}

function logInfo(message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: "info", message, ...context }));
}

function logError(message: string, context?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "error", message, ...context }));
}

// POST /api/cron/reminders - Send reminder emails (called by Vercel Cron)
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            throw errors.unauthorized();
        }

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            throw errors.internal("Email service not configured");
        }

        const now = new Date();
        const clerk = await clerkClient();
        const batchSize = Number(process.env.REMINDER_BATCH_SIZE || 20);

        // Get all users with email reminders enabled
        const usersWithReminders = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.emailRemindersEnabled, true));

        let sentCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        const processUser = async (user: typeof usersWithReminders[number]) => {
            try {
                // Convert current time to user's timezone
                const userTime = toZonedTime(now, user.reminderTimezone || "UTC");
                const userHour = userTime.getHours();
                const userMinute = userTime.getMinutes();
                const todayLocal = format(userTime, "yyyy-MM-dd");

                // Parse reminder time
                const [reminderHour, reminderMinute] = user.reminderTime
                    .split(":")
                    .map(Number);

                // Check if it's time to send reminder (within 30-minute window)
                const nowMinutes = userHour * 60 + userMinute;
                const reminderMinutes = reminderHour * 60 + reminderMinute;
                const isReminderTime = Math.abs(nowMinutes - reminderMinutes) <= 30;

                if (!isReminderTime) {
                    return { sent: 0, skipped: 1, errors: 0 };
                }

                // Skip weekends if configured
                if (user.skipWeekends && isWeekend(userTime)) {
                    return { sent: 0, skipped: 1, errors: 0 };
                }

                // Skip if already reminded today
                if (user.lastReminderSentAt) {
                    const lastSentLocal = format(
                        toZonedTime(user.lastReminderSentAt, user.reminderTimezone || "UTC"),
                        "yyyy-MM-dd"
                    );
                    if (lastSentLocal === todayLocal) {
                        return { sent: 0, skipped: 1, errors: 0 };
                    }
                }

                // Check if user already has an entry for today
                const existingEntry = await db
                    .select({ id: entries.id })
                    .from(entries)
                    .where(
                        and(
                            eq(entries.userId, user.userId),
                            eq(entries.entryDate, todayLocal),
                            isNull(entries.deletedAt)
                        )
                    )
                    .limit(1);

                if (existingEntry.length > 0) {
                    return { sent: 0, skipped: 1, errors: 0 };
                }

                const clerkUser = await withRetry(
                    () => clerk.users.getUser(user.userId),
                    2,
                    200
                );
                const userEmail = clerkUser.emailAddresses.find(
                    (email) => email.id === clerkUser.primaryEmailAddressId
                )?.emailAddress;

                if (!userEmail) {
                    return { sent: 0, skipped: 1, errors: 0 };
                }

                await withRetry(
                    () =>
                        resend.emails.send({
                            from: "Accomplish <reminders@accomplish.today>",
                            to: userEmail,
                            subject: "Don't forget to log your accomplishments today! 📝",
                            html: `
                      <h2>Hey there!</h2>
                      <p>You haven't logged your accomplishments for today yet.</p>
                      <p>Taking 2 minutes now will save you hours during your next performance review.</p>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard?reminder=1"
                         style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Log Today's Entry
                      </a>
                      <p style="color: #666; margin-top: 24px;">
                        <small>
                          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Manage notification settings</a>
                        </small>
                      </p>
                    `,
                        }),
                    2,
                    300
                );

                await db
                    .update(userSettings)
                    .set({ lastReminderSentAt: now, updatedAt: new Date() })
                    .where(eq(userSettings.userId, user.userId));

                await posthogCaptureServer(user.userId, "reminder_sent", {
                    timezone: user.reminderTimezone,
                    reminder_time: user.reminderTime,
                    skip_weekends: user.skipWeekends,
                });

                logInfo("Reminder sent", { user_id: user.userId, date: todayLocal });
                return { sent: 1, skipped: 0, errors: 0 };
            } catch (userError) {
                logError("Reminder failed", { user_id: user.userId, error: String(userError) });
                captureServerError(userError, { scope: "reminder_cron", userId: user.userId });
                return { sent: 0, skipped: 0, errors: 1 };
            }
        };

        for (let i = 0; i < usersWithReminders.length; i += batchSize) {
            const batch = usersWithReminders.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(processUser));
            for (const result of results) {
                sentCount += result.sent;
                skippedCount += result.skipped;
                errorCount += result.errors;
            }
        }

        return successResponse({
            message: "Reminder job completed",
            processed: usersWithReminders.length,
            sent: sentCount,
            skipped: skippedCount,
            errors: errorCount,
            timestamp: now.toISOString(),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// Allow GET for testing (remove in production)
export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
        return handleApiError(errors.forbidden());
    }

    return POST(request);
}
