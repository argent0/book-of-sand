function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === "true";
}

export const config = {
  ollama: {
    host: str("OLLAMA_HOST", "http://127.0.0.1:11434"),
    model: str("OLLAMA_MODEL", "llama3.1"),
    temperature: num("OLLAMA_TEMPERATURE", 0.9),
    requestTimeoutMs: num("OLLAMA_REQUEST_TIMEOUT_MS", 30000),
  },
  imageGen: {
    enabled: bool("IMAGE_GEN_ENABLED", true),
    host: str("IMAGE_GEN_HOST", "http://127.0.0.1:7860"),
    requestTimeoutMs: num("IMAGE_GEN_REQUEST_TIMEOUT_MS", 20000),
    width: num("IMAGE_GEN_WIDTH", 768),
    height: num("IMAGE_GEN_HEIGHT", 768),
    steps: num("IMAGE_GEN_STEPS", 30),
    sampler: str("IMAGE_GEN_SAMPLER", "Euler a"),
  },
  illustrationProbability: num("ILLUSTRATION_PROBABILITY", 0.18),
  structured: {
    windowSize: num("STRUCTURED_WINDOW_SIZE", 5),
    mediumHops: num("STRUCTURED_MEDIUM_HOPS", 3),
  },
};
