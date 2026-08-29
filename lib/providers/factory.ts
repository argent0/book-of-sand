import { config } from "../config";
import { OllamaTextProvider } from "./ollama/textProvider";
import { ComfyImageProvider } from "./image/comfyImageProvider";
import { PiperSpeechProvider } from "./speech/piperSpeechProvider";
import type { TextGenProvider, ImageGenProvider, SpeechProvider } from "./types";

let textProvider: TextGenProvider | null = null;
let imageProvider: ImageGenProvider | null = null;
let speechProvider: SpeechProvider | null = null;

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
    imageProvider = new ComfyImageProvider(
      config.imageGen.host,
      config.imageGen.requestTimeoutMs,
      config.imageGen.model,
      config.imageGen.width,
      config.imageGen.height,
      config.imageGen.steps,
      config.imageGen.cfg
    );
  }
  return imageProvider;
}

export function getSpeechProvider(): SpeechProvider {
  if (!speechProvider) {
    speechProvider = new PiperSpeechProvider(config.tts.host, config.tts.requestTimeoutMs);
  }
  return speechProvider;
}
