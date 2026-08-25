import type { Direction, JumpSize, SkeletonState } from "./providers/types";

export function hopsForJumpSize(jumpSize: JumpSize, mediumHops: number): number {
  if (jumpSize === "medium") return Math.max(1, mediumHops);
  return 1;
}

export function resetSkeleton(topic: string): SkeletonState {
  return { topics: [topic], currentIndex: 0 };
}

/**
 * Local models don't reliably respect "produce exactly N topics" — clamp the
 * model's output to the exact hop count so the algorithmic small/medium/large
 * hop-count contract holds regardless of model compliance.
 */
export function normalizeChainLength(chain: string[], expectedLength: number): string[] {
  if (chain.length >= expectedLength) {
    return chain.slice(0, expectedLength);
  }
  const padded = [...chain];
  while (padded.length < expectedLength) {
    padded.push(chain[chain.length - 1]);
  }
  return padded;
}

/**
 * Splices a freshly generated chain of topics into the skeleton, overwriting
 * whatever was on the side being walked into, then trims back to the window
 * size from the trailing end opposite the direction of travel.
 */
export function walkSkeleton(
  skeleton: SkeletonState,
  direction: Direction,
  chain: string[],
  windowSize: number
): SkeletonState {
  const { topics, currentIndex } = skeleton;

  let newTopics: string[];
  let newCurrentIndex: number;

  if (direction === "forward") {
    newTopics = [...topics.slice(0, currentIndex + 1), ...chain];
    newCurrentIndex = currentIndex + chain.length;
  } else {
    newTopics = [...[...chain].reverse(), ...topics.slice(currentIndex)];
    newCurrentIndex = 0;
  }

  return trimSkeletonWindow({ topics: newTopics, currentIndex: newCurrentIndex }, direction, windowSize);
}

function trimSkeletonWindow(state: SkeletonState, direction: Direction, windowSize: number): SkeletonState {
  let { topics, currentIndex } = state;
  const size = Math.max(1, windowSize);

  if (direction === "forward") {
    while (topics.length > size && currentIndex > 0) {
      topics = topics.slice(1);
      currentIndex -= 1;
    }
  } else {
    while (topics.length > size && currentIndex < topics.length - 1) {
      topics = topics.slice(0, -1);
    }
  }

  return { topics, currentIndex };
}
