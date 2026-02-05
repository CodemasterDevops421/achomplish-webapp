import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { errors } from "@/lib/api-utils";

const AI_TIMEOUT = Number(process.env.OPENAI_TIMEOUT_S || 10) * 1000;

const anthropic =
    process.env.ANTHROPIC_API_KEY
        ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: AI_TIMEOUT })
        : null;

const openai =
    process.env.OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: AI_TIMEOUT })
        : null;

type AnthropicBlock = { type?: string; text?: string };
type AnthropicResponse = { content?: AnthropicBlock[] };

function extractAnthropicText(response: unknown): string | null {
    if (!response || typeof response !== "object") return null;
    const content = (response as AnthropicResponse).content;
    if (!Array.isArray(content)) return null;
    const text = content
        .map((block) => (block.type === "text" ? block.text || "" : ""))
        .join("")
        .trim();
    return text || null;
}

function extractJsonFromText(text: string): string {
    try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed);
    } catch {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            throw errors.badRequest("AI returned invalid JSON");
        }
        const candidate = text.slice(start, end + 1);
        try {
            const parsed = JSON.parse(candidate);
            return JSON.stringify(parsed);
        } catch {
            throw errors.badRequest("AI returned invalid JSON");
        }
    }
}

export async function getEnhancementJson(entryText: string): Promise<{
    provider: "anthropic" | "openai";
    model: string;
    json: string;
}> {
    const system = `You are a professional work accomplishment summarizer. Given a work log entry, create:
1. A concise title (max 60 chars)
2. 2-3 bullet points highlighting key accomplishments with impact
3. A category (one of: Development, Documentation, Leadership, Operations, Design, Research, Communication, Other)

Respond in JSON format only:
{
  "title": "...",
  "bullets": ["...", "..."],
  "category": "..."
}`;

    if (anthropic) {
        const model = process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307";
        try {
            const response = await anthropic.messages.create({
                model,
                max_tokens: 500,
                system,
                messages: [{ role: "user", content: entryText }],
            });
            const text = extractAnthropicText(response);
            if (text) {
                return { provider: "anthropic", model, json: extractJsonFromText(text) };
            }
        } catch (error) {
            if (!openai) throw error;
        }
    }

    if (openai) {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        const response = await openai.chat.completions.create({
            model,
            max_tokens: 500,
            messages: [
                { role: "system", content: system },
                { role: "user", content: entryText },
            ],
            response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (!content) throw errors.badRequest("AI returned empty response");
        return { provider: "openai", model, json: content };
    }

    throw errors.badRequest("AI service not configured. Please add ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

export async function getGeneratedText(prompt: string): Promise<{
    provider: "anthropic" | "openai";
    model: string;
    text: string;
}> {
    if (anthropic) {
        const model = process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307";
        try {
            const response = await anthropic.messages.create({
                model,
                max_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 2000),
                messages: [{ role: "user", content: prompt }],
            });
            const text = extractAnthropicText(response);
            if (text) {
                return { provider: "anthropic", model, text };
            }
        } catch (error) {
            if (!openai) throw error;
        }
    }

    if (openai) {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        const maxTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 2000);
        const response = await openai.chat.completions.create({
            model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) throw errors.badRequest("AI returned empty response");
        return { provider: "openai", model, text: content };
    }

    throw errors.badRequest("AI service not configured. Please add ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}
