import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors, ApiError } from "@/lib/api-utils";
import { aiEnhancementResponseSchema, enhanceEntryLegacySchema, enhanceEntrySchema } from "@/lib/validations";
import { checkRateLimit, cleanupRateLimits, getEntryById, saveEnrichment } from "@/lib/db/queries";
import { getEnhancementJson } from "@/lib/ai/providers";

// POST /api/ai/enhance - Enhance an entry with AI
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        let entryId: string;
        const parsed = enhanceEntrySchema.safeParse(body);
        if (parsed.success) {
            entryId = parsed.data.entry_id;
        } else {
            const legacyParsed = enhanceEntryLegacySchema.safeParse(body);
            if (!legacyParsed.success) {
                throw legacyParsed.error;
            }
            entryId = legacyParsed.data.entryId;
        }

        const rate = await checkRateLimit(userId, "ai_enhance", 10, 60);
        if (!rate.allowed) {
            throw errors.tooManyRequests();
        }

        // Get the entry
        const entry = await getEntryById(entryId, userId);
        if (!entry) {
            throw errors.notFound("Entry");
        }

        let response;
        try {
            response = await getEnhancementJson(entry.rawText);
        } catch (aiError) {
            await cleanupRateLimits(86400);
            if (aiError instanceof ApiError) {
                throw aiError;
            }
            return Response.json(
                { error: "AI enhancement timed out", code: "TIMEOUT", fallback: true },
                { status: 504 }
            );
        }

        // Parse AI response
        const parsedResult = aiEnhancementResponseSchema.safeParse(JSON.parse(response.json));
        if (!parsedResult.success) {
            throw errors.badRequest("AI returned invalid response format");
        }
        const aiResult = parsedResult.data;

        // Save enrichment
        const enrichment = await saveEnrichment(entryId, {
            aiProvider: response.provider,
            aiModel: response.model,
            aiTitle: aiResult.title,
            aiBullets: aiResult.bullets,
            aiCategory: aiResult.category,
        });

        return successResponse({
            id: enrichment.id,
            entry_id: enrichment.entryId,
            ai_provider: enrichment.aiProvider,
            ai_model: enrichment.aiModel,
            ai_title: enrichment.aiTitle,
            ai_bullets: enrichment.aiBullets,
            ai_category: enrichment.aiCategory,
        });
    } catch (error) {
        await cleanupRateLimits(86400);
        return handleApiError(error);
    }
}
