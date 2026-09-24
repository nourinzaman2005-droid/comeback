import { NextResponse } from "next/server";
import {
  explanationContext,
  groundedFallback,
  isClearanceRequest,
  LANGUAGES,
  Language,
  validateExplanation,
} from "@/lib/ai/explanation";
import { Stage, STAGES } from "@/lib/data/types";

type RequestBody = {
  stage?: string;
  language?: string;
  question?: string;
};

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function withinRateLimit(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 10) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!withinRateLimit(request)) {
    return NextResponse.json(
      { error: "Please wait before requesting another explanation" },
      { status: 429 },
    );
  }
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!STAGES.includes(body.stage as Stage)) {
    return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  }
  if (!LANGUAGES.includes(body.language as Language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }
  const stage = body.stage as Stage;
  const language = body.language as Language;
  const question = body.question?.slice(0, 300) ?? "";
  const fallback = groundedFallback(stage, language, question);
  if (isClearanceRequest(question) || !process.env.GROQ_API_KEY) {
    return NextResponse.json(fallback);
  }

  const context = explanationContext(stage);
  const allowedCitation = fallback.citations[0];
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.1,
        max_completion_tokens: 350,
        messages: [
          {
            role: "system",
            content: `You explain a postpartum cricket return-to-play stage in ${language}. Use only the supplied JSON. Never diagnose, provide clearance, decide readiness, recommend stage progression, or invent a citation. The stage field and citation must be copied exactly. Return concise JSON.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Explain the current stage in plain language",
              stage,
              question,
              allowedCitation,
              context,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "stage_explanation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                stage: { type: "string", enum: [stage] },
                summary: { type: "string" },
                nextStep: { type: "string" },
                safetyNote: { type: "string" },
                citations: {
                  type: "array",
                  items: { type: "string", enum: [allowedCitation] },
                  minItems: 1,
                  maxItems: 1,
                },
              },
              required: ["stage", "summary", "nextStep", "safetyNote", "citations"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return NextResponse.json(fallback);
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    if (!validateExplanation(parsed, stage, allowedCitation)) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json({ ...parsed, source: "groq" });
  } catch {
    return NextResponse.json(fallback);
  }
}
