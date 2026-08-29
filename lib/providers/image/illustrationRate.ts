// Adapts how often illustrations are requested based on how long the image
// backend has actually been taking. Fast generations keep the rate near the
// configured max; slow ones taper it down; a timeout drops it to zero so a
// struggling backend stops being asked until it recovers.
let currentProbability: number | null = null;

export function getIllustrationProbability(maxProbability: number): number {
  return currentProbability ?? maxProbability;
}

export function recordGenerationSuccess(inferMs: number, maxProbability: number, fastMs: number, slowMs: number): void {
  if (inferMs <= fastMs) {
    currentProbability = maxProbability;
    return;
  }
  if (inferMs >= slowMs) {
    currentProbability = 0;
    return;
  }
  const slowness = (inferMs - fastMs) / (slowMs - fastMs);
  currentProbability = maxProbability * (1 - slowness);
}

export function recordGenerationTimeout(): void {
  currentProbability = 0;
}
