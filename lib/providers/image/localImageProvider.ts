import { ILLUSTRATION_NEGATIVE_PROMPT, ILLUSTRATION_STYLE_PREFIX } from "../../prompt/text";
import { ImageGenUnavailableError } from "../errors";
import type { GenerateImageParams, GeneratedImage, ImageGenProvider } from "../types";

export class LocalSDImageProvider implements ImageGenProvider {
  constructor(
    private readonly host: string,
    private readonly timeoutMs: number,
    private readonly width: number,
    private readonly height: number,
    private readonly steps: number,
    private readonly sampler: string
  ) {}

  async generateImage({ prompt }: GenerateImageParams): Promise<GeneratedImage> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          prompt: `${ILLUSTRATION_STYLE_PREFIX} ${prompt}`,
          negative_prompt: ILLUSTRATION_NEGATIVE_PROMPT,
          steps: this.steps,
          width: this.width,
          height: this.height,
          sampler_name: this.sampler,
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
