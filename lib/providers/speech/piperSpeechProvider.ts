import { SpeechGenUnavailableError } from "../errors";
import type { SpeechProvider, SynthesizeSpeechParams, SynthesizedSpeech } from "../types";

export class PiperSpeechProvider implements SpeechProvider {
  constructor(
    private readonly host: string,
    private readonly timeoutMs: number
  ) {}

  async synthesizeSpeech({ text }: SynthesizeSpeechParams): Promise<SynthesizedSpeech> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({ text }),
      });
    } catch {
      throw new SpeechGenUnavailableError();
    }

    if (!res.ok) {
      throw new SpeechGenUnavailableError();
    }

    const audio = await res.arrayBuffer();
    if (audio.byteLength === 0) {
      throw new SpeechGenUnavailableError();
    }

    return { audio, contentType: res.headers.get("content-type") ?? "audio/wav" };
  }
}
