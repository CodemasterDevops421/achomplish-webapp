import { NextRequest } from "next/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { db, userSettings, entries } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { format, isWeekend } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { clerkClient } from "@clerk/nextjs/server";
import { posthogCaptureServer } from "@/lib/posthog";

const resend = new Resend(process.env.RESEND_API_KEY);

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
            throw errors.badRequest("Email service not configured");
        }

        const now = new Date();

        // Get all users with email reminders enabled
        const usersWithReminders = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.emailRemindersEnabled, true));

        let sentCount = 0;
        let skippedCount = 0;

        for (const user of usersWithReminders) {
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
                    skippedCount++;
                    continue;
                }

                // Skip weekends if configured
                if (user.skipWeekends && isWeekend(userTime)) {
                    skippedCount++;
                    continue;
                }

                // Skip if already reminded today
                if (user.lastReminderSentAt) {
                    const lastSentLocal = format(
                        toZonedTime(user.lastReminderSentAt, user.reminderTimezone || "UTC"),
                        "yyyy-MM-dd"
                    );
                    if (lastSentLocal === todayLocal) {
                        skippedCount++;
                        continue;
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
                    skippedCount++;
                    continue;
                }

                const clerk = await clerkClient();
                const clerkUser = await clerk.users.getUser(user.userId);
                const userEmail = clerkUser.emailAddresses.find(
                    (email) => email.id === clerkUser.primaryEmailAddressId
                )?.emailAddress;

                if (!userEmail) {
                    skippedCount++;
                    continue;
                }

                await resend.emails.send({
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
                });

                await db
                    .update(userSettings)
                    .set({ lastReminderSentAt: now, updatedAt: new Date() })
                    .where(eq(userSettings.userId, user.userId));

                await posthogCaptureServer(user.userId, "reminder_sent", {
                    timezone: user.reminderTimezone,
                    reminder_time: user.reminderTime,
                    skip_weekends: user.skipWeekends,
                });

                sentCount++;
            } catch (userError) {
                console.error(`Failed to process user ${user.userId}:`, userError);
            }
        }

        return successResponse({
            message: "Reminder job completed",
            processed: usersWithReminders.length,
            sent: sentCount,
            skipped: skippedCount,
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
