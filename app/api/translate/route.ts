import { NextRequest, NextResponse } from "next/server";
import { getTextProvider } from "../../../lib/providers/factory";
import type { Language } from "../../../lib/providers/types";

function parseLanguage(value: unknown): Language {
  return value === "es" ? "es" : "en";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const text = typeof body.text === "string" ? body.text : "";
  const language = parseLanguage(body.language);

  if (text.trim().length === 0) {
    return NextResponse.json({ error: "missing-text" }, { status: 400 });
  }

  try {
    const translated = await getTextProvider().translatePage({ text, language });
    return NextResponse.json({ text: translated });
  } catch {
    return NextResponse.json({ error: "text-generation-unavailable" }, { status: 503 });
  }
}
