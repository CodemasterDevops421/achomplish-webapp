import { errors, ApiError } from "@/lib/api-utils";
import { checkRateLimit, cleanupRateLimits, getEntriesInRange } from "@/lib/db/queries";
import { db, generatedOutputs } from "@/lib/db";
import { getGeneratedText } from "@/lib/ai/providers";

function validateReviewOutput(content: string) {
    const rawLines = content.split(/\r?\n/);
    const lines = rawLines.map((line) => line.trim());
    const summaryIndex = lines.findIndex((line) => /^##\s*summary$/i.test(line));
    const accomplishmentsIndex = lines.findIndex((line) =>
        /^##\s*key accomplishments$/i.test(line)
    );

    let summaryBlock = "";
    if (summaryIndex !== -1 && accomplishmentsIndex !== -1 && accomplishmentsIndex > summaryIndex) {
        summaryBlock = lines.slice(summaryIndex + 1, accomplishmentsIndex).join("\n");
    } else {
        // Fallback: use everything before the first bullet list as summary
        const firstBullet = lines.findIndex((line) => line.startsWith("- "));
        summaryBlock = firstBullet === -1 ? lines.join("\n") : lines.slice(0, firstBullet).join("\n");
    }

    const paragraphs = summaryBlock
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

    const bulletCount = lines.filter((line) => line.startsWith("- ")).length;

    if (paragraphs.length < 3 || paragraphs.length > 5) {
        throw errors.badRequest("AI returned invalid summary length");
    }
    if (bulletCount < 6 || bulletCount > 10) {
        throw errors.badRequest("AI returned invalid accomplishments bullet count");
    }
}

function validateResumeOutput(content: string) {
    const bulletCount = content
        .split(/\r?\n/)
        .filter((line) => line.trim().startsWith("- ")).length;
    if (bulletCount < 8 || bulletCount > 12) {
        throw errors.badRequest("AI returned invalid resume bullet count");
    }
}

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
        response = await getGeneratedText(prompt);
    } catch (aiError) {
        await cleanupRateLimits(86400);
        if (aiError instanceof ApiError) {
            throw aiError;
        }
        throw errors.timeout("AI generation");
    }

    const content = response.text;
    if (!content) {
        throw errors.badRequest("AI returned empty response");
    }

    if (type === "review") {
        validateReviewOutput(content);
    } else {
        validateResumeOutput(content);
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
