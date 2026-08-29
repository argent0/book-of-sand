import type { PromptText } from "./loadPrompts";

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Randomly combines one setting + one object (+ a coin-flip mood) into a
// short inspiration fragment, so pages/topics invented from nothing don't
// collapse onto the same handful of images every time. See the comment
// above seedFragments in config/prompts.yaml for why this exists.
export function pickSeedFragment(prompts: PromptText): string {
  const { settings, objects, moods } = prompts.seedFragments;
  const parts = [pick(settings), pick(objects)];
  if (Math.random() < 0.5) {
    parts.push(pick(moods));
  }
  return `${prompts.seedFragmentPrefix} ${parts.join("; ")}.`;
}
