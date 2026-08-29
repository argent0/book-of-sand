import { loadPrompts } from "../../prompt/loadPrompts";
import { ImageGenTimeoutError, ImageGenUnavailableError } from "../errors";
import type { GenerateImageParams, GeneratedImage, ImageGenProvider } from "../types";

export class ComfyImageProvider implements ImageGenProvider {
  constructor(
    private readonly host: string,
    private readonly timeoutMs: number,
    private readonly model: string,
    private readonly width: number,
    private readonly height: number,
    private readonly steps: number,
    private readonly cfg: number
  ) {}

  async generateImage({ prompt }: GenerateImageParams): Promise<GeneratedImage> {
    const prompts = loadPrompts();
    let res: Response;
    try {
      res = await fetch(`${this.host}/v1/images/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          prompt: `${prompts.illustrationStylePrefix} ${prompt}`,
          negative_prompt: prompts.illustrationNegativePrompt,
          model: this.model,
          width: this.width,
          height: this.height,
          steps: this.steps,
          cfg: this.cfg,
        }),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new ImageGenTimeoutError();
      }
      throw new ImageGenUnavailableError();
    }

    if (res.status === 504) {
      throw new ImageGenTimeoutError();
    }
    if (!res.ok) {
      throw new ImageGenUnavailableError();
    }

    const json = await res.json();
    const image = json?.image_b64;
    if (typeof image !== "string" || image.length === 0) {
      throw new ImageGenUnavailableError();
    }

    const inferMs = typeof json?.infer_ms === "number" ? json.infer_ms : undefined;
    return { dataUrl: `data:image/png;base64,${image}`, inferMs };
  }
}
