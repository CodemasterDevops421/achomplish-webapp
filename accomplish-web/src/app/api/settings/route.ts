import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { updateSettingsSchema } from "@/lib/validations";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/settings - Get user settings
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const result = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        if (result.length === 0) {
            // Return defaults if no settings exist
            return successResponse({
                emailRemindersEnabled: true,
                reminderTime: "18:30",
                reminderTimezone: "UTC",
                skipWeekends: true,
            });
        }

        const settings = result[0];
        return successResponse({
            emailRemindersEnabled: settings.emailRemindersEnabled,
            reminderTime: settings.reminderTime,
            reminderTimezone: settings.reminderTimezone,
            skipWeekends: settings.skipWeekends,
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
        const updates = updateSettingsSchema.parse(body);

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
                    reminderTimezone: updates.reminderTimezone ?? "UTC",
                    skipWeekends: updates.skipWeekends ?? true,
                })
                .returning();
            settings = created[0];
        } else {
            // Update existing settings
            const updated = await db
                .update(userSettings)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(eq(userSettings.userId, userId))
                .returning();
            settings = updated[0];
        }

        return successResponse({
            emailRemindersEnabled: settings.emailRemindersEnabled,
            reminderTime: settings.reminderTime,
            reminderTimezone: settings.reminderTimezone,
            skipWeekends: settings.skipWeekends,
            updatedAt: settings.updatedAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
