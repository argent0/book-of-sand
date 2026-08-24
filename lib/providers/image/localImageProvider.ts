import { ImageGenUnavailableError } from "../errors";
import type { GenerateImageParams, GeneratedImage, ImageGenProvider } from "../types";

export class LocalSDImageProvider implements ImageGenProvider {
  constructor(
    private readonly host: string,
    private readonly timeoutMs: number,
    private readonly width: number,
    private readonly height: number,
    private readonly steps: number
  ) {}

  async generateImage({ prompt }: GenerateImageParams): Promise<GeneratedImage> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          prompt: `antique engraving illustration, black and white, woodcut style, ${prompt}`,
          negative_prompt: "color, modern, photo, watermark, text, signature",
          steps: this.steps,
          width: this.width,
          height: this.height,
          sampler_name: "Euler a",
        }),
      });
    } catch {
      throw new ImageGenUnavailableError();
    }

    if (!res.ok) {
      throw new ImageGenUnavailableError();
    }

    const json = await res.json();
    const image = json?.images?.[0];
    if (typeof image !== "string" || image.length === 0) {
      throw new ImageGenUnavailableError();
    }

    return { dataUrl: `data:image/png;base64,${image}` };
  }
}
