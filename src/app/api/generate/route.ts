// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

export const runtime = "nodejs";

type Body = {
  mode: "scene" | "tryon";
  userImageBase64: string;   // dataURL или чистый base64
  libImageBase64: string;    // dataURL или чистый base64
  preset: "wb" | "ig-portrait" | "ig-square";
  prompt: string;
};

const PRESETS = {
  wb: { w: 1200, h: 1600, quality: 90 },          // Wildberries 3:4
  "ig-portrait": { w: 1080, h: 1350, quality: 90 },
  "ig-square": { w: 1080, h: 1080, quality: 90 },
};

function instruction(mode: Body["mode"]) {
  return mode === "scene"
    ? "Insert the product from the first image into the second image (background). Place it on a flat surface with correct perspective and a soft contact shadow. Match white balance and noise. Commercial clean look. Output ONE photorealistic image."
    : "Use the second image as clothing reference. Replace ONLY the clothing area on the person in the first image; keep face, hair, body intact. Match fabric drape and lighting, remove artifacts near hands/neck. Output ONE studio-clean ecommerce image.";
}

function strip(b64: string) {
  const i = b64.indexOf("base64,");
  return i >= 0 ? b64.slice(i + 7) : b64;
}
function parseInline(b64: string) {
  const m = /^data:(.*?);base64,/.exec(b64);
  return { mime: m?.[1] || "image/jpeg", data: strip(b64) };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const { mode, userImageBase64, libImageBase64, preset, prompt } = (await req.json()) as Body;

    if (!mode || !userImageBase64 || !libImageBase64) {
      return NextResponse.json({ error: "Нужно два изображения и режим" }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_API_KEY не задан" }, { status: 500 });

    const u = parseInline(userImageBase64);
    const l = parseInline(libImageBase64);

    // --- Using Google GenAI SDK ---
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: u.mime, data: u.data } },
          { inlineData: { mimeType: l.mime, data: l.data } },
          { text: prompt || instruction(mode) },
        ]
      }],
    });

    // Extract image data from response
    interface ContentPart {
      inlineData?: { mimeType?: string; data?: string };
      text?: string;
    }
    const parts: ContentPart[] = response.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p?.inlineData?.data);
    if (!imgPart?.inlineData?.data) {
      const msg = parts.map((p) => p?.text).filter(Boolean).join("\n");
      return NextResponse.json({ error: msg || "Модель не вернула изображение" }, { status: 400 });
    }
    const raw = Buffer.from(imgPart.inlineData.data, "base64");

    const p = PRESETS[preset] ?? PRESETS.wb;
    const out = await sharp(raw).resize({ width: p.w, height: p.h, fit: "cover" })
      .jpeg({ quality: p.quality }).toBuffer();

    return NextResponse.json({
      mimeType: "image/jpeg",
      imageBase64: out.toString("base64"),
      latency_ms: Date.now() - t0
    });

  } catch (e: unknown) {
    const errorMessage = typeof e === "object" && e !== null && "message" in e ? (e as { message?: string }).message : undefined;
    console.error("GENERATION_ERROR:", errorMessage);
    return NextResponse.json({ error: `AI call failed: ${errorMessage || "Server error"}` }, { status: 500 });
  }
}
