import { NextResponse } from "next/server";
import { Resend } from "resend";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return withCors(req, NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 }));
  }

  try {
    const body = await req.json();
    const to = body?.to;
    const subject = String(body?.subject || "").trim();
    const html = typeof body?.html === "string" ? body.html : undefined;
    const text = typeof body?.text === "string" ? body.text : undefined;

    if (!to || !subject) {
      return withCors(req, NextResponse.json({ error: "Missing required fields: to, subject" }, { status: 400 }));
    }
    if (!html && !text) {
      return withCors(req, NextResponse.json({ error: "Provide either html or text" }, { status: 400 }));
    }

    const from = String(body?.from || "Pacific Engineering <noreply@pacificengineeringsf.com>");
    const toList = Array.isArray(to) ? to : [to];

    const result = await resend.emails.send({
      from,
      to: toList,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    });

    if (result.error) {
      return withCors(req, NextResponse.json({ error: result.error.message || "Email failed" }, { status: 502 }));
    }

    return withCors(req, NextResponse.json({ success: true, id: result.data?.id }));
  } catch (e) {
    console.error(e);
    return withCors(req, NextResponse.json({ error: "Email failed" }, { status: 500 }));
  }
}