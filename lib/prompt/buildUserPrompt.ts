import type { Direction, JumpSize } from "../providers/types";
import { loadPrompts } from "./loadPrompts";

export function buildUserPrompt(params: {
  currentPageText: string | null;
  direction: Direction;
  jumpSize: JumpSize;
  wantIllustration: boolean;
  topic?: string;
}): string {
  const { currentPageText, direction, jumpSize, wantIllustration, topic } = params;
  const prompts = loadPrompts();

  const parts: string[] = [];

  if (topic) {
    parts.push(`The topic for this page is: "${topic}"`);
    if (currentPageText !== null) {
      parts.push(`${prompts.topicVoiceReferencePrefix}\n\n"""\n${currentPageText}\n"""`);
    }
  } else if (currentPageText === null) {
    parts.push(prompts.openingPageInstruction);
  } else {
    parts.push(`The current page reads:\n\n"""\n${currentPageText}\n"""\n`);
    parts.push(
      `The reader is turning the book ${direction === "forward" ? "forward" : "backward"}. ${prompts.proseDriftInstruction[jumpSize]}`
    );
  }

  if (currentPageText !== null) {
    parts.push(prompts.numberingIndependenceInstruction);
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
