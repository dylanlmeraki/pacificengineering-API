import { NextResponse } from "next/server";
import OpenAI from "openai";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return withCors(req, NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 }));
  }

  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();
    if (!prompt) return withCors(req, NextResponse.json({ error: "Missing prompt" }, { status: 400 }));

    const model = String(body?.model || "gpt-4o-mini");
    const max_tokens = Number.isFinite(body?.max_tokens) ? body.max_tokens : 1024;
    const temperature = Number.isFinite(body?.temperature) ? body.temperature : 0.7;

    const useJson = body?.response_type === "json" || !!body?.response_json_schema;

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (body?.context) messages.push({ role: "system", content: String(body.context) });
    messages.push({ role: "user", content: prompt });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
      ...(useJson ? { response_format: { type: "json_object" } } : {}),
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let content: any = raw;

    if (useJson) {
      try { content = JSON.parse(raw); } catch { content = raw; }
    }

    return withCors(req, NextResponse.json({ content, model }));
  } catch (e) {
    console.error(e);
    return withCors(req, NextResponse.json({ error: "LLM request failed" }, { status: 500 }));
  }
}