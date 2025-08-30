// src/app/api/netcheck/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "NO_API_KEY" }, { status: 500 });

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const r = await fetch(url, { method: "GET" });
    const txt = await r.text();
    return NextResponse.json({ ok: r.ok, status: r.status, sample: txt.slice(0, 200) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
