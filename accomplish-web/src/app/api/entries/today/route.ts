import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { getEntryByDate, getTodayDate } from "@/lib/db/queries";

// GET /api/entries/today - Get today's entry
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const today = getTodayDate();
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
                entryDate: entry.entryDate,
                rawText: entry.rawText,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
                enrichment: entry.enrichment
                    ? {
                        aiTitle: entry.enrichment.aiTitle,
                        aiBullets: entry.enrichment.aiBullets,
                        aiCategory: entry.enrichment.aiCategory,
                    }
                    : null,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
