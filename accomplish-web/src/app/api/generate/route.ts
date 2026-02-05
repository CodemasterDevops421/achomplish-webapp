import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { generateOutputLegacySchema, generateOutputSchema } from "@/lib/validations";
import { generateOutput } from "@/lib/ai/generate";

// POST /api/generate - Legacy endpoint for review/resume generation
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = await request.json();
        let rangeStart: string;
        let rangeEnd: string;
        const parsed = generateOutputSchema.safeParse(body);
        if (parsed.success) {
            rangeStart = parsed.data.range_start;
            rangeEnd = parsed.data.range_end;
        } else {
            const legacyParsed = generateOutputLegacySchema.safeParse(body);
            if (!legacyParsed.success) {
                throw legacyParsed.error;
            }
            rangeStart = legacyParsed.data.rangeStart;
            rangeEnd = legacyParsed.data.rangeEnd;
        }

        const type = body.type as "review" | "resume" | undefined;
        if (!type) {
            throw errors.badRequest("Missing output type. Use review or resume.");
        }

        const result = await generateOutput(userId, type, rangeStart, rangeEnd);
        const bulletCount =
            type === "resume"
                ? result.saved.outputMarkdown
                      .split(/\r?\n/)
                      .filter((line) => line.trim().startsWith("- ")).length
                : undefined;

        return successResponse({
            id: result.saved.id,
            type: result.saved.type,
            range_start: result.saved.rangeStart,
            range_end: result.saved.rangeEnd,
            output_markdown: result.saved.outputMarkdown,
            entry_count: result.entryCount,
            ...(type === "resume" ? { bullet_count: bulletCount } : {}),
            created_at: result.saved.createdAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
