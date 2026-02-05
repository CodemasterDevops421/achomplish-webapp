import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApiError, errors } from "@/lib/api-utils";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

type ExportPayload = {
    content: string;
    filename?: string;
};

function buildDoc(content: string): Document {
    const lines = content.split(/\r?\n/);
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
        if (line.startsWith("## ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^##\s+/, ""),
                    heading: HeadingLevel.HEADING_2,
                })
            );
            continue;
        }

        if (line.startsWith("# ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^#\s+/, ""),
                    heading: HeadingLevel.HEADING_1,
                })
            );
            continue;
        }

        if (line.startsWith("- ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^-\s+/, ""),
                    bullet: { level: 0 },
                })
            );
            continue;
        }

        paragraphs.push(
            new Paragraph({
                children: [new TextRun(line || " ")],
            })
        );
    }

    return new Document({
        sections: [{ children: paragraphs }],
    });
}

// POST /api/export/docx - Export content to docx
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        const body = (await request.json()) as ExportPayload;
        if (!body?.content) {
            throw errors.badRequest("Missing content");
        }

        const doc = buildDoc(body.content);
        const buffer = await Packer.toBuffer(doc);
        const fileBytes = new Uint8Array(buffer);

        return new Response(fileBytes, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${
                    body.filename || "export.docx"
                }"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
