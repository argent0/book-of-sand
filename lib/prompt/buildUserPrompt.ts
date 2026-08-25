import type { Direction, JumpSize } from "../providers/types";
import { NUMBERING_INDEPENDENCE_INSTRUCTION, OPENING_PAGE_INSTRUCTION, PROSE_DRIFT_INSTRUCTION, TOPIC_VOICE_REFERENCE_PREFIX } from "./text";

export function buildUserPrompt(params: {
  currentPageText: string | null;
  direction: Direction;
  jumpSize: JumpSize;
  wantIllustration: boolean;
  topic?: string;
}): string {
  const { currentPageText, direction, jumpSize, wantIllustration, topic } = params;

  const parts: string[] = [];

  if (topic) {
    parts.push(`The topic for this page is: "${topic}"`);
    if (currentPageText !== null) {
      parts.push(`${TOPIC_VOICE_REFERENCE_PREFIX}\n\n"""\n${currentPageText}\n"""`);
    }
  } else if (currentPageText === null) {
    parts.push(OPENING_PAGE_INSTRUCTION);
  } else {
    parts.push(`The current page reads:\n\n"""\n${currentPageText}\n"""\n`);
    parts.push(
      `The reader is turning the book ${direction === "forward" ? "forward" : "backward"}. ${PROSE_DRIFT_INSTRUCTION[jumpSize]}`
    );
  }

  if (currentPageText !== null) {
    parts.push(NUMBERING_INDEPENDENCE_INSTRUCTION);
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
