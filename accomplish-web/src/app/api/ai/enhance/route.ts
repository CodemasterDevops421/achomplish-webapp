import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { enhanceEntrySchema } from "@/lib/validations";
import { getEntryById, saveEnrichment } from "@/lib/db/queries";

const AI_TIMEOUT = 30000; // 30 seconds

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
        const { entryId } = enhanceEntrySchema.parse(body);

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

        const response = await openai.chat.completions.create({
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

        // Parse AI response
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw errors.badRequest("AI returned empty response");
        }

        const aiResult = JSON.parse(content) as {
            title: string;
            bullets: string[];
            category: string;
        };

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
            entryId: enrichment.entryId,
            aiProvider: enrichment.aiProvider,
            aiModel: enrichment.aiModel,
            aiTitle: enrichment.aiTitle,
            aiBullets: enrichment.aiBullets,
            aiCategory: enrichment.aiCategory,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
