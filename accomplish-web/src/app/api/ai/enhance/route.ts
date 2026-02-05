import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { aiEnhancementResponseSchema, enhanceEntryLegacySchema, enhanceEntrySchema } from "@/lib/validations";
import { checkRateLimit, cleanupRateLimits, getEntryById, saveEnrichment } from "@/lib/db/queries";

const AI_TIMEOUT = Number(process.env.OPENAI_TIMEOUT_S || 10) * 1000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: AI_TIMEOUT,
});

// POST /api/ai/enhance - Enhance an entry with AI
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        const parsed = enhanceEntrySchema.safeParse(body);
        const legacyParsed = parsed.success ? null : enhanceEntryLegacySchema.safeParse(body);
        if (!parsed.success && !legacyParsed?.success) {
            throw legacyParsed?.error ?? parsed.error;
        }

        const entryId = parsed.success ? parsed.data.entry_id : legacyParsed!.data.entryId;

        const rate = await checkRateLimit(userId, "ai_enhance", 10, 60);
        if (!rate.allowed) {
            throw errors.tooManyRequests();
        }

        // Get the entry
        const entry = await getEntryById(entryId, userId);
        if (!entry) {
            throw errors.notFound("Entry");
        }

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            throw errors.badRequest("AI service not configured. Please add OPENAI_API_KEY.");
        }

        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        let response;
        try {
            response = await openai.chat.completions.create({
                model,
                max_tokens: 500,
                messages: [
                    {
                        role: "system",
                        content: `You are a professional work accomplishment summarizer. Given a work log entry, create:
1. A concise title (max 60 chars)
2. 2-3 bullet points highlighting key accomplishments with impact
3. A category (one of: Development, Documentation, Leadership, Operations, Design, Research, Communication, Other)

Respond in JSON format only:
{
  "title": "...",
  "bullets": ["...", "..."],
  "category": "..."
}`,
                    },
                    {
                        role: "user",
                        content: entry.rawText,
                    },
                ],
                response_format: { type: "json_object" },
            });
        } catch (aiError) {
            await cleanupRateLimits(86400);
            return Response.json(
                { error: "AI enhancement timed out", code: "TIMEOUT", fallback: true },
                { status: 504 }
            );
        }

        // Parse AI response
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw errors.badRequest("AI returned empty response");
        }

        const parsedResult = aiEnhancementResponseSchema.safeParse(JSON.parse(content));
        if (!parsedResult.success) {
            throw errors.badRequest("AI returned invalid response format");
        }
        const aiResult = parsedResult.data;

        // Save enrichment
        const enrichment = await saveEnrichment(entryId, {
            aiProvider: "openai",
            aiModel: model,
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
