import { config } from "../config";
import { OllamaTextProvider } from "./ollama/textProvider";
import { LocalSDImageProvider } from "./image/localImageProvider";
import type { TextGenProvider, ImageGenProvider } from "./types";

let textProvider: TextGenProvider | null = null;
let imageProvider: ImageGenProvider | null = null;

export function getTextProvider(): TextGenProvider {
  if (!textProvider) {
    textProvider = new OllamaTextProvider(
      config.ollama.host,
      config.ollama.model,
      config.ollama.temperature,
      config.ollama.requestTimeoutMs,
      config.structured.windowSize,
      config.structured.mediumHops
    );
  }
  return textProvider;
}

export function getImageProvider(): ImageGenProvider {
  if (!imageProvider) {
    imageProvider = new LocalSDImageProvider(
      config.imageGen.host,
      config.imageGen.requestTimeoutMs,
      config.imageGen.width,
      config.imageGen.height,
      config.imageGen.steps,
      config.imageGen.sampler
    );
  }
  return imageProvider;
}
