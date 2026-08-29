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
    host: str("IMAGE_GEN_HOST", "http://constantinople:8189"),
    // Cold start (ComfyUI child spawn + first weight load) can take minutes
    // on a x1 PCIe link, so this must stay generous.
    requestTimeoutMs: num("IMAGE_GEN_REQUEST_TIMEOUT_MS", 180000),
    model: str("IMAGE_GEN_MODEL", "sdxl"),
    width: num("IMAGE_GEN_WIDTH", 1024),
    height: num("IMAGE_GEN_HEIGHT", 1024),
    steps: num("IMAGE_GEN_STEPS", 25),
    cfg: num("IMAGE_GEN_CFG", 7.0),
  },
  illustrationProbability: num("ILLUSTRATION_PROBABILITY", 0.18),
  structured: {
    windowSize: num("STRUCTURED_WINDOW_SIZE", 5),
    mediumHops: num("STRUCTURED_MEDIUM_HOPS", 3),
  },
};
