import type { Direction, JumpSize } from "../providers/types";
import { loadPrompts } from "./loadPrompts";
import { pickSeedFragment } from "./seedFragments";

export function buildInventStartTopicPrompt(): string {
  const prompts = loadPrompts();
  return [
    prompts.inventStartTopicInstruction,
    pickSeedFragment(prompts),
    'Respond with JSON only: { "topics": string[] } — an array containing exactly 1 short topic phrase (a few words).',
  ].join("\n\n");
}

export function buildSeedFromPagePrompt(pageText: string): string {
  const prompts = loadPrompts();
  return [
    `${prompts.pageQuoteIntro}\n\n"""\n${pageText}\n"""`,
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
  const prompts = loadPrompts();
  const instruction = prompts.topicDriftInstruction[jumpSize].replace("{hops}", String(hops));
  const expectedCount = jumpSize === "medium" ? hops : 1;

  return [
    `The seed topic is: "${seedTopic}"`,
    `The reader is moving ${direction === "forward" ? "forward" : "backward"} through the book. ${instruction}`,
    `Respond with JSON only: { "topics": string[] } — an array of exactly ${expectedCount} short topic phrase(s) (a few words each), in order from nearest to farthest from the seed.`,
  ].join("\n\n");
}
