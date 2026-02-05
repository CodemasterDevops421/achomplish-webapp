import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { updateSettingsLegacySchema, updateSettingsSchema } from "@/lib/validations";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { normalizeTimezone } from "@/lib/timezone";

// GET /api/settings - Get user settings
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const requestedTz =
            request.headers.get("x-user-timezone") ||
            request.headers.get("x-vercel-ip-timezone") ||
            "UTC";
        const safeTz = normalizeTimezone(requestedTz);

        const result = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        if (result.length === 0) {
            // Return defaults if no settings exist (do not write on GET)
            return successResponse({
                email_reminders_enabled: true,
                reminder_time: "18:30",
                reminder_timezone: safeTz,
                skip_weekends: true,
            });
        }

        const settings = result[0];
        return successResponse({
            email_reminders_enabled: settings.emailRemindersEnabled,
            reminder_time: settings.reminderTime,
            reminder_timezone: settings.reminderTimezone,
            skip_weekends: settings.skipWeekends,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        const requestedTz =
            request.headers.get("x-user-timezone") ||
            request.headers.get("x-vercel-ip-timezone") ||
            "UTC";
        const safeTz = normalizeTimezone(requestedTz);
        const parsed = updateSettingsSchema.safeParse(body);
        let updates: {
            emailRemindersEnabled?: boolean;
            reminderTime?: string;
            reminderTimezone?: string;
            skipWeekends?: boolean;
        };
        if (parsed.success) {
            updates = {
                emailRemindersEnabled: parsed.data.email_reminders_enabled,
                reminderTime: parsed.data.reminder_time,
                reminderTimezone: parsed.data.reminder_timezone,
                skipWeekends: parsed.data.skip_weekends,
            };
        } else {
            const legacyParsed = updateSettingsLegacySchema.safeParse(body);
            if (!legacyParsed.success) {
                throw legacyParsed.error;
            }
            updates = legacyParsed.data;
        }

        // Check if settings exist
        const existing = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        let settings;
        if (existing.length === 0) {
            // Create new settings
            const created = await db
                .insert(userSettings)
                .values({
                    userId,
                    emailRemindersEnabled: updates.emailRemindersEnabled ?? true,
                    reminderTime: updates.reminderTime ?? "18:30",
                    reminderTimezone: normalizeTimezone(updates.reminderTimezone ?? safeTz),
                    skipWeekends: updates.skipWeekends ?? true,
                })
                .onConflictDoNothing({ target: userSettings.userId })
                .returning();
            if (created.length) {
                settings = created[0];
            } else {
                const existing = await db
                    .select()
                    .from(userSettings)
                    .where(eq(userSettings.userId, userId))
                    .limit(1);
                if (!existing.length) {
                    throw errors.internal("Failed to create user settings");
                }
                settings = existing[0];
            }
        } else {
            // Update existing settings
            const updated = await db
                .update(userSettings)
                .set({
                    ...(updates.emailRemindersEnabled !== undefined
                        ? { emailRemindersEnabled: updates.emailRemindersEnabled }
                        : {}),
                    ...(updates.reminderTime !== undefined
                        ? { reminderTime: updates.reminderTime }
                        : {}),
                    ...(updates.reminderTimezone !== undefined
                        ? { reminderTimezone: updates.reminderTimezone }
                        : {}),
                    ...(updates.skipWeekends !== undefined
                        ? { skipWeekends: updates.skipWeekends }
                        : {}),
                    updatedAt: new Date(),
                })
                .where(eq(userSettings.userId, userId))
                .returning();
            settings = updated[0];
        }

        return successResponse({
            email_reminders_enabled: settings.emailRemindersEnabled,
            reminder_time: settings.reminderTime,
            reminder_timezone: settings.reminderTimezone,
            skip_weekends: settings.skipWeekends,
            updated_at: settings.updatedAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
