import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { createEntrySchema, createEntryLegacySchema, paginationSchema } from "@/lib/validations";
import { getEntriesPaginated, getTodayDate, upsertEntry } from "@/lib/db/queries";
import { db, userSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

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
        const search = searchParams.get("q")?.trim() || undefined;

        const result = await getEntriesPaginated(userId, page, limit, search);

        return successResponse({
            entries: result.entries.map((entry) => ({
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
        const parsed = createEntrySchema.safeParse(body);
        if (parsed.success) {
            var rawText = parsed.data.raw_text;
            var entryDate = parsed.data.entry_date;
        } else {
            const legacyParsed = createEntryLegacySchema.safeParse(body);
            if (!legacyParsed.success) {
                throw legacyParsed.error;
            }
            var rawText = legacyParsed.data.rawText;
            var entryDate = legacyParsed.data.entryDate;
        }

        const settings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);
        const timezone = settings[0]?.reminderTimezone || "UTC";
        const today = getTodayDate(timezone);
        if (entryDate && entryDate !== today) {
            throw errors.badRequest("Entries can only be created or updated for today.");
        }

        const entry = await upsertEntry(userId, rawText, entryDate || today);

        return successResponse(
            {
                id: entry.id,
                entry_date: entry.entryDate,
                raw_text: entry.rawText,
                created_at: entry.createdAt,
                updated_at: entry.updatedAt,
            },
            entry.createdAt === entry.updatedAt ? 201 : 200
        );
    } catch (error) {
        return handleApiError(error);
    }
}
