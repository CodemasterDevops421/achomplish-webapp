import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { generateOutputSchema } from "@/lib/validations";
import { getEntriesInRange } from "@/lib/db/queries";
import { db, generatedOutputs } from "@/lib/db";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/generate - Generate review or resume bullets
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        const { type, rangeStart, rangeEnd } = generateOutputSchema.parse(body);

        // Get entries in range
        const entries = await getEntriesInRange(userId, rangeStart, rangeEnd);

        if (entries.length < 5) {
            throw errors.badRequest(
                `Minimum 5 entries required. You have ${entries.length} entries in this range.`
            );
        }

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            throw errors.badRequest("AI service not configured. Please add OPENAI_API_KEY.");
        }

        // Prepare input - use AI enrichments if available, otherwise use raw text
        const summaries = entries.map((entry) => {
            if (entry.enrichment?.aiTitle && entry.enrichment?.aiBullets) {
                return {
                    date: entry.entryDate,
                    title: entry.enrichment.aiTitle,
                    bullets: entry.enrichment.aiBullets,
                    category: entry.enrichment.aiCategory,
                };
            }
            return {
                date: entry.entryDate,
                text: entry.rawText.slice(0, 500), // Truncate raw text to save tokens
            };
        });

        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        const prompt =
            type === "review"
                ? `You are a professional career coach. Based on the following work accomplishments, write a comprehensive performance review that:
1. Summarizes key achievements in 3-5 paragraphs
2. Provides 6-10 bullet points highlighting measurable impact
3. Uses professional, confident language suitable for self-reviews

Accomplishments from ${rangeStart} to ${rangeEnd}:
${JSON.stringify(summaries, null, 2)}

Format the output as:
## Summary
[3-5 paragraphs]

## Key Accomplishments
- [bullet 1]
- [bullet 2]
...`
                : `You are a professional resume writer. Based on the following work accomplishments, create 8-12 punchy resume bullet points that:
1. Start with strong action verbs
2. Include quantifiable results where possible
3. Are concise (under 150 characters each)
4. Highlight impact and achievements

Accomplishments from ${rangeStart} to ${rangeEnd}:
${JSON.stringify(summaries, null, 2)}

Output only the bullet points, one per line, starting with "-".`;

        const response = await openai.chat.completions.create({
            model,
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw errors.badRequest("AI returned empty response");
        }

        // Save the generated output
        const saved = await db
            .insert(generatedOutputs)
            .values({
                userId,
                type,
                rangeStart,
                rangeEnd,
                outputMarkdown: content,
                inputSnapshot: summaries,
            })
            .returning();

        return successResponse({
            id: saved[0].id,
            type: saved[0].type,
            rangeStart: saved[0].rangeStart,
            rangeEnd: saved[0].rangeEnd,
            outputMarkdown: saved[0].outputMarkdown,
            entryCount: entries.length,
            createdAt: saved[0].createdAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
