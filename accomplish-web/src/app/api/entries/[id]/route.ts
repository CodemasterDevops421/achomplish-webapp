import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { updateEntrySchema, updateEntryLegacySchema } from "@/lib/validations";
import { getEntryById, updateEntry, softDeleteEntry } from "@/lib/db/queries";

type Params = Promise<{ id: string }>;

// GET /api/entries/[id] - Get single entry
export async function GET(
    request: NextRequest,
    { params }: { params: Params }
) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const { id } = await params;
        const entry = await getEntryById(id, userId);

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

// PATCH /api/entries/[id] - Update entry
export async function PATCH(
    request: NextRequest,
    { params }: { params: Params }
) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const { id } = await params;
        const body = await request.json();
        const parsed = updateEntrySchema.safeParse(body);
        const legacyParsed = parsed.success ? null : updateEntryLegacySchema.safeParse(body);
        if (!parsed.success && !legacyParsed?.success) {
            throw legacyParsed?.error ?? parsed.error;
        }

        const rawText = parsed.success ? parsed.data.raw_text : legacyParsed!.data.rawText;

        const entry = await updateEntry(id, userId, rawText);

        if (!entry) {
            throw errors.notFound("Entry");
        }

        return successResponse({
            id: entry.id,
            entry_date: entry.entryDate,
            raw_text: entry.rawText,
            updated_at: entry.updatedAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/entries/[id] - Soft delete entry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Params }
) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const { id } = await params;
        const deleted = await softDeleteEntry(id, userId);

        if (!deleted) {
            throw errors.notFound("Entry");
        }

        return successResponse({ message: "Entry deleted", id });
    } catch (error) {
        return handleApiError(error);
    }
}
