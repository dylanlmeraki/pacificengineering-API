import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "edge";

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return withCors(req, NextResponse.json({ error: "No file provided" }, { status: 400 }));
    }

    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return withCors(req, NextResponse.json({ file_url: blob.url, filename: file.name, pathname: blob.pathname }));
  } catch (e) {
    console.error(e);
    return withCors(req, NextResponse.json({ error: "Upload failed" }, { status: 500 }));
  }
}