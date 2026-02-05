import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { getEntryByDate, getTodayDate } from "@/lib/db/queries";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/entries/today - Get today's entry
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const settings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);
        const timezone = settings[0]?.reminderTimezone || "UTC";
        const today = getTodayDate(timezone);
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
