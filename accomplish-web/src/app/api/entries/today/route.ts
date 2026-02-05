import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { getEntryByDate, getTodayDate } from "@/lib/db/queries";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { normalizeTimezone } from "@/lib/timezone";

// GET /api/entries/today - Get today's entry
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const requestedTz =
            request.headers.get("x-user-timezone") ||
            request.headers.get("x-vercel-ip-timezone") ||
            "UTC";
        const safeTz = normalizeTimezone(requestedTz);

        const settings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        let timezone = settings[0]?.reminderTimezone;
        if (!timezone) {
            const created = await db
                .insert(userSettings)
                .values({
                    userId,
                    emailRemindersEnabled: true,
                    reminderTime: "18:30",
                    reminderTimezone: safeTz,
                    skipWeekends: true,
                })
                .onConflictDoNothing({ target: userSettings.userId })
                .returning();
            if (created.length) {
                timezone = created[0].reminderTimezone;
            } else {
                const existing = await db
                    .select()
                    .from(userSettings)
                    .where(eq(userSettings.userId, userId))
                    .limit(1);
                timezone = existing[0]?.reminderTimezone;
            }
        }
        const today = getTodayDate(normalizeTimezone(timezone));
        const entry = await getEntryByDate(userId, today);

        if (!entry) {
            return successResponse({
                exists: false,
                entry: null,
                date: today,
            });
        }

        return successResponse({
            exists: true,
            date: today,
            entry: {
                id: entry.id,
                entry_date: entry.entryDate,
                raw_text: entry.rawText,
                created_at: entry.createdAt,
                updated_at: entry.updatedAt,
                enrichment: entry.enrichment
                    ? {
                        ai_title: entry.enrichment.aiTitle,
                        ai_bullets: entry.enrichment.aiBullets,
                        ai_category: entry.enrichment.aiCategory,
                    }
                    : null,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
