import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../lib/config";
import { getSpeechProvider } from "../../../lib/providers/factory";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";

  if (!config.tts.enabled) {
    return NextResponse.json({ error: "tts-disabled" }, { status: 503 });
  }
  if (text.trim().length === 0) {
    return NextResponse.json({ error: "missing-text" }, { status: 400 });
  }

  try {
    const { audio, contentType } = await getSpeechProvider().synthesizeSpeech({ text });
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "speech-unavailable" }, { status: 503 });
  }
}
