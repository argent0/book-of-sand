import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../lib/config";
import { getImageProvider, getTextProvider } from "../../../lib/providers/factory";
import type { Direction, JumpSize } from "../../../lib/providers/types";

function parseDirection(value: unknown): Direction {
  return value === "backward" ? "backward" : "forward";
}

function parseJumpSize(value: unknown): JumpSize {
  return value === "medium" || value === "large" ? value : "small";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const currentPageText = typeof body.currentPageText === "string" ? body.currentPageText : null;
  const direction = parseDirection(body.direction);
  const jumpSize = parseJumpSize(body.jumpSize);
  const wantIllustration =
    currentPageText !== null &&
    config.imageGen.enabled &&
    Math.random() < config.illustrationProbability;

  let page;
  try {
    page = await getTextProvider().generatePage({
      currentPageText,
      direction,
      jumpSize,
      wantIllustration,
    });
  } catch {
    return NextResponse.json({ error: "text-generation-unavailable" }, { status: 503 });
  }

  let illustration: { dataUrl: string; description: string } | undefined;
  if (page.illustrationPrompt) {
    try {
      const img = await getImageProvider().generateImage({ prompt: page.illustrationPrompt });
      illustration = { dataUrl: img.dataUrl, description: page.illustrationPrompt };
    } catch {
      // Graceful degradation: image backend unavailable, page still renders as text-only.
    }
  }

  return NextResponse.json({
    text: page.text,
    pageNumber: page.pageNumber,
    illustration,
  });
}
