import OpenAI from "openai";
import { errors, ApiError } from "@/lib/api-utils";
import { checkRateLimit, cleanupRateLimits, getEntriesInRange } from "@/lib/db/queries";
import { db, generatedOutputs } from "@/lib/db";

const AI_TIMEOUT = Number(process.env.OPENAI_TIMEOUT_S || 10) * 1000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: AI_TIMEOUT,
});

function buildGroupedSummary(summaries: Array<Record<string, unknown>>): string {
    const grouped: Record<string, Array<Record<string, unknown>>> = {};
    for (const item of summaries) {
        const date = String(item.date || "");
        const month = date.slice(0, 7) || "unknown";
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(item);
    }

    const lines: string[] = [];
    for (const month of Object.keys(grouped).sort()) {
        lines.push(`Month: ${month}`);
        for (const item of grouped[month]) {
            if (item.title && item.bullets) {
                lines.push(`- ${item.date}: ${item.title} :: ${(item.bullets as string[]).join(" | ")}`);
            } else if (item.text) {
                lines.push(`- ${item.date}: ${item.text}`);
            }
        }
    }

    return lines.join("\n");
}

export async function generateOutput(
    userId: string,
    type: "review" | "resume",
    rangeStart: string,
    rangeEnd: string
) {
    const rate = await checkRateLimit(userId, `generate_${type}`, 3, 60);
    if (!rate.allowed) {
        throw errors.tooManyRequests();
    }

    const entries = await getEntriesInRange(userId, rangeStart, rangeEnd);
    if (entries.length < 5) {
        throw new ApiError(400, "VALIDATION_ERROR", "Minimum 5 entries required", {
            entry_count: entries.length,
        });
    }

    if (!process.env.OPENAI_API_KEY) {
        throw errors.badRequest("AI service not configured. Please add OPENAI_API_KEY.");
    }

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
            text: entry.rawText.slice(0, 200),
        };
    });

    const groupedSummary = buildGroupedSummary(summaries);
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const maxTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 2000);

    const prompt =
        type === "review"
            ? `You are a professional career coach. Based on the following grouped accomplishments, write a comprehensive performance review that:
1. Summarizes key achievements in 3-5 paragraphs
2. Provides 6-10 bullet points highlighting measurable impact
3. Uses professional, confident language suitable for self-reviews

Accomplishments from ${rangeStart} to ${rangeEnd}:
${groupedSummary}

Format the output as:
## Summary
[3-5 paragraphs]

## Key Accomplishments
- [bullet 1]
- [bullet 2]
...`
            : `You are a professional resume writer. Based on the following grouped accomplishments, create 8-12 punchy resume bullet points that:
1. Start with strong action verbs
2. Include quantifiable results where possible
3. Are concise (under 150 characters each)
4. Highlight impact and achievements

Accomplishments from ${rangeStart} to ${rangeEnd}:
${groupedSummary}

Output only the bullet points, one per line, starting with "-".`;

    let response;
    try {
        response = await openai.chat.completions.create({
            model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }],
        });
    } catch (aiError) {
        await cleanupRateLimits(86400);
        throw errors.timeout("AI generation");
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw errors.badRequest("AI returned empty response");
    }

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

    await cleanupRateLimits(86400);

    return {
        saved: saved[0],
        entryCount: entries.length,
    };
}
