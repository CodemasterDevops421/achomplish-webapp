import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { createEntrySchema, paginationSchema } from "@/lib/validations";
import { getEntriesPaginated, upsertEntry } from "@/lib/db/queries";

// GET /api/entries - List entries with pagination
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const searchParams = request.nextUrl.searchParams;
        const { page, limit } = paginationSchema.parse({
            page: searchParams.get("page") || 1,
            limit: searchParams.get("limit") || 20,
        });

        const result = await getEntriesPaginated(userId, page, limit);

        return successResponse({
            entries: result.entries.map((entry) => ({
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
            })),
            pagination: {
                page,
                limit,
                total: result.total,
                hasMore: result.hasMore,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/entries - Create or update today's entry
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        const { rawText, entryDate } = createEntrySchema.parse(body);

        const entry = await upsertEntry(userId, rawText, entryDate);

        return successResponse(
            {
                id: entry.id,
                entryDate: entry.entryDate,
                rawText: entry.rawText,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            },
            entry.createdAt === entry.updatedAt ? 201 : 200
        );
    } catch (error) {
        return handleApiError(error);
    }
}
