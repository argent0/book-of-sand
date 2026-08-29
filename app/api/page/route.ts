import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../lib/config";
import { getImageProvider, getTextProvider } from "../../../lib/providers/factory";
import { ImageGenTimeoutError } from "../../../lib/providers/errors";
import {
  getIllustrationProbability,
  recordGenerationSuccess,
  recordGenerationTimeout,
} from "../../../lib/providers/image/illustrationRate";
import type { Direction, JumpSize, Mode, SkeletonState } from "../../../lib/providers/types";

function parseDirection(value: unknown): Direction {
  return value === "backward" ? "backward" : "forward";
}

function parseJumpSize(value: unknown): JumpSize {
  return value === "medium" || value === "large" ? value : "small";
}

function parseMode(value: unknown): Mode {
  return value === "structured" ? "structured" : "direct";
}

function parseSkeleton(value: unknown): SkeletonState | null {
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as SkeletonState).topics) &&
    (value as SkeletonState).topics.every((t) => typeof t === "string") &&
    typeof (value as SkeletonState).currentIndex === "number"
  ) {
    return value as SkeletonState;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const currentPageText = typeof body.currentPageText === "string" ? body.currentPageText : null;
  const direction = parseDirection(body.direction);
  const jumpSize = parseJumpSize(body.jumpSize);
  const mode = parseMode(body.mode);
  const skeleton = parseSkeleton(body.skeleton);
  const isFirstPage = currentPageText === null;
  const wantIllustration =
    config.imageGen.enabled &&
    (isFirstPage || Math.random() < getIllustrationProbability(config.illustration.maxProbability));

  let page;
  try {
    page = await getTextProvider().generatePage({
      currentPageText,
      direction,
      jumpSize,
      wantIllustration,
      mode,
      skeleton,
    });
  } catch {
    return NextResponse.json({ error: "text-generation-unavailable" }, { status: 503 });
  }

  let illustration: { dataUrl: string; description: string } | undefined;
  if (page.illustrationPrompt) {
    try {
      const img = await getImageProvider().generateImage({ prompt: page.illustrationPrompt });
      illustration = { dataUrl: img.dataUrl, description: page.illustrationPrompt };
      if (typeof img.inferMs === "number") {
        recordGenerationSuccess(
          img.inferMs,
          config.illustration.maxProbability,
          config.illustration.fastMs,
          config.illustration.slowMs
        );
      }
    } catch (err) {
      // Graceful degradation: image backend unavailable, page still renders as text-only.
      if (err instanceof ImageGenTimeoutError) {
        recordGenerationTimeout();
      }
    }
  }

  return NextResponse.json({
    text: page.text,
    pageNumber: page.pageNumber,
    illustration,
    skeleton: page.skeleton,
  });
}
