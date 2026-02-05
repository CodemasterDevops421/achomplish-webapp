import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { getEntryByDate } from "@/lib/db/queries";
import { z } from "zod";

type Params = Promise<{ date: string }>;

const dateParamSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");

// GET /api/entries/[date] - Get entry for specific date
export async function GET(
    request: NextRequest,
    { params }: { params: Params }
) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const { date } = await params;
        const entryDate = dateParamSchema.parse(date);
        const entry = await getEntryByDate(userId, entryDate);

        if (!entry) {
            throw errors.notFound("Entry");
        }

        return successResponse({
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
        });
    } catch (error) {
        return handleApiError(error);
    }
}
