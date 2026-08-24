import type { Direction, JumpSize } from "../providers/types";

const DRIFT_INSTRUCTION: Record<JumpSize, string> = {
  small:
    "The reader has turned only a leaf or two. Stay close: the same or a closely related topic, imagery, and tone, as if the text simply kept going, only shifting a little.",
  medium:
    "The reader has skipped a modest handful of leaves. Drift noticeably: a related but distinct topic, a partial shift in tone or subject.",
  large:
    "The reader has skipped many leaves at once. Drift substantially: a related but clearly different topic, as if a large, unseen stretch of the book lies between the two pages.",
};

export function buildUserPrompt(params: {
  currentPageText: string | null;
  direction: Direction;
  jumpSize: JumpSize;
  wantIllustration: boolean;
}): string {
  const { currentPageText, direction, jumpSize, wantIllustration } = params;

  const parts: string[] = [];

  if (currentPageText === null) {
    parts.push(
      "The book falls open at an arbitrary point. Generate a page as if opened at random, with no prior page to relate to."
    );
  } else {
    parts.push(`The current page reads:\n\n"""\n${currentPageText}\n"""\n`);
    parts.push(
      `The reader is turning the book ${direction === "forward" ? "forward" : "backward"}. ${DRIFT_INSTRUCTION[jumpSize]}`
    );
    parts.push(
      "The new page's number bears no logical or sequential relation to the current page's number — only the content's topical distance should scale with how far the reader jumped, not the numbering."
    );
  }

  parts.push(
    'Respond with JSON only, matching this shape: { "pageText": string, "pageNumber": string of Arabic numerals' +
      (wantIllustration
        ? ', "illustrationPrompt": a 1-2 sentence visual description, suitable for a black-and-white engraving-style illustration, matching the page\'s content'
        : "") +
      " }"
  );

  return parts.join("\n\n");
}
