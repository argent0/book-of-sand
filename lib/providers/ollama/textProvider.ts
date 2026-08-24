import { config } from "../../config";
import { SYSTEM_PROMPT } from "../../prompt/systemPrompt";
import { buildUserPrompt } from "../../prompt/buildUserPrompt";
import { isValidPageNumber, randomPageNumber } from "../../prompt/pageNumber";
import { TextGenUnavailableError } from "../errors";
import type { GeneratePageParams, GeneratedPage, TextGenProvider } from "../types";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    pageText: { type: "string" },
    pageNumber: { type: "string" },
    illustrationPrompt: { type: "string" },
  },
  required: ["pageText", "pageNumber"],
};

export class OllamaTextProvider implements TextGenProvider {
  constructor(
    private readonly host: string,
    private readonly model: string,
    private readonly temperature: number,
    private readonly timeoutMs: number
  ) {}

  async generatePage(params: GeneratePageParams): Promise<GeneratedPage> {
    const userPrompt = buildUserPrompt(params);

    let res: Response;
    try {
      res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          format: RESPONSE_SCHEMA,
          stream: false,
          options: { temperature: this.temperature },
        }),
      });
    } catch {
      throw new TextGenUnavailableError();
    }

    if (!res.ok) {
      throw new TextGenUnavailableError();
    }

    const json = await res.json();
    let parsed: { pageText?: unknown; pageNumber?: unknown; illustrationPrompt?: unknown };
    try {
      parsed = JSON.parse(json.message.content);
    } catch {
      throw new TextGenUnavailableError("Ollama returned unparseable output");
    }

    if (typeof parsed.pageText !== "string" || parsed.pageText.trim().length === 0) {
      throw new TextGenUnavailableError("Ollama returned an empty page");
    }

    return {
      text: parsed.pageText.trim(),
      pageNumber: isValidPageNumber(parsed.pageNumber) ? parsed.pageNumber : randomPageNumber(),
      illustrationPrompt:
        params.wantIllustration && typeof parsed.illustrationPrompt === "string"
          ? parsed.illustrationPrompt.trim()
          : undefined,
    };
  }
}
