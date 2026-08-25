import type { Direction, JumpSize } from "../providers/types";

export const TOPIC_SYSTEM_PROMPT = `You maintain the hidden thematic skeleton behind pages of "the Book of Sand," an infinite fictional book. Your only job is to name short topic phrases (a few words each, e.g. "a cartographer's forbidden maps") that a page could be about — never write the page itself, and never explain your reasoning. Respond only with the requested JSON.`;

const CHAIN_DRIFT_INSTRUCTION: Record<JumpSize, string> = {
  small:
    "Produce exactly 1 new topic that is a slight variation of the seed topic — same idea, nudged just a little, as if the text simply kept going.",
  medium:
    "Produce a chain of {hops} topics, each one step further from the seed and from the previous topic in the chain, ending on a related but clearly distinct subject.",
  large:
    "Produce exactly 1 new topic that is a substantial departure from the seed — related only distantly or thematically, as if drawn from a completely different, unseen part of the book.",
};

export function buildInventStartTopicPrompt(): string {
  return [
    "Invent an arbitrary starting topic for a page of the book, as if it fell open at random.",
    'Respond with JSON only: { "topics": string[] } — an array containing exactly 1 short topic phrase (a few words).',
  ].join("\n\n");
}

export function buildSeedFromPagePrompt(pageText: string): string {
  return [
    `Here is a page of "the Book of Sand":\n\n"""\n${pageText}\n"""`,
    'Respond with JSON only: { "topics": string[] } — an array containing exactly 1 short topic phrase (a few words) summarizing this page\'s subject.',
  ].join("\n\n");
}

export function buildTopicChainPrompt(params: {
  seedTopic: string;
  direction: Direction;
  jumpSize: JumpSize;
  hops: number;
}): string {
  const { seedTopic, direction, jumpSize, hops } = params;
  const instruction = CHAIN_DRIFT_INSTRUCTION[jumpSize].replace("{hops}", String(hops));
  const expectedCount = jumpSize === "medium" ? hops : 1;

  return [
    `The seed topic is: "${seedTopic}"`,
    `The reader is moving ${direction === "forward" ? "forward" : "backward"} through the book. ${instruction}`,
    `Respond with JSON only: { "topics": string[] } — an array of exactly ${expectedCount} short topic phrase(s) (a few words each), in order from nearest to farthest from the seed.`,
  ].join("\n\n");
}
