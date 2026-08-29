import { buildUserPrompt } from "../../prompt/buildUserPrompt";
import { buildInventStartTopicPrompt, buildSeedFromPagePrompt, buildTopicChainPrompt } from "../../prompt/topicPrompts";
import { loadPrompts } from "../../prompt/loadPrompts";
import { isValidPageNumber, randomPageNumber } from "../../prompt/pageNumber";
import { hopsForJumpSize, normalizeChainLength, resetSkeleton, walkSkeleton } from "../../skeleton";
import { TextGenUnavailableError } from "../errors";
import type {
  GeneratePageParams,
  GeneratedPage,
  Language,
  SkeletonState,
  TextGenProvider,
  TranslatePageParams,
} from "../types";

const PAGE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    pageText: { type: "string" },
    pageNumber: { type: "string" },
    illustrationPrompt: { type: "string" },
  },
  required: ["pageText", "pageNumber"],
};

const TRANSLATION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    pageText: { type: "string" },
  },
  required: ["pageText"],
};

const TOPIC_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    topics: { type: "array", items: { type: "string" } },
  },
  required: ["topics"],
};

export class OllamaTextProvider implements TextGenProvider {
  constructor(
    private readonly host: string,
    private readonly model: string,
    private readonly temperature: number,
    private readonly timeoutMs: number,
    private readonly windowSize: number,
    private readonly mediumHops: number
  ) {}

  async generatePage(params: GeneratePageParams): Promise<GeneratedPage> {
    if (params.mode === "structured") {
      return this.generateStructuredPage(params);
    }
    return this.generateDirectPage(params);
  }

  private async generateDirectPage(params: GeneratePageParams): Promise<GeneratedPage> {
    const userPrompt = buildUserPrompt(params);
    return this.callProseModel(userPrompt, params.wantIllustration, params.language);
  }

  private async generateStructuredPage(params: GeneratePageParams): Promise<GeneratedPage> {
    let skeleton = params.skeleton;

    if (!skeleton) {
      const seedTopic = params.currentPageText
        ? await this.callTopicModel(buildSeedFromPagePrompt(params.currentPageText), params.language)
        : await this.callTopicModel(buildInventStartTopicPrompt(), params.language);
      skeleton = resetSkeleton(seedTopic[0]);
    }

    const hops = hopsForJumpSize(params.jumpSize, this.mediumHops);
    const seedTopic = skeleton.topics[skeleton.currentIndex];
    const rawChain = await this.callTopicModel(
      buildTopicChainPrompt({ seedTopic, direction: params.direction, jumpSize: params.jumpSize, hops }),
      params.language
    );
    const chain = normalizeChainLength(rawChain, hops);

    const newSkeleton: SkeletonState =
      params.jumpSize === "large"
        ? resetSkeleton(chain[0])
        : walkSkeleton(skeleton, params.direction, chain, this.windowSize);

    const topic = newSkeleton.topics[newSkeleton.currentIndex];
    const userPrompt = buildUserPrompt({ ...params, topic });
    const page = await this.callProseModel(userPrompt, params.wantIllustration, params.language);

    return { ...page, skeleton: newSkeleton };
  }

  async translatePage({ text, language }: TranslatePageParams): Promise<string> {
    const prompts = loadPrompts();
    const userPrompt = [
      `Translate the following page into ${prompts.translationLanguageName[language]}:`,
      `"""\n${text}\n"""`,
      'Respond with JSON only: { "pageText": string } — the translated page.',
    ].join("\n\n");

    const json = await this.chat(prompts.translationSystemPrompt, userPrompt, TRANSLATION_RESPONSE_SCHEMA);

    let parsed: { pageText?: unknown };
    try {
      parsed = JSON.parse(json.message.content);
    } catch {
      throw new TextGenUnavailableError("Ollama returned unparseable translation output");
    }

    if (typeof parsed.pageText !== "string" || parsed.pageText.trim().length === 0) {
      throw new TextGenUnavailableError("Ollama returned an empty translation");
    }

    return parsed.pageText.trim();
  }

  private async callProseModel(userPrompt: string, wantIllustration: boolean, language: Language): Promise<GeneratedPage> {
    const prompts = loadPrompts();
    const systemPrompt = withLanguage(prompts.proseSystemPrompt, prompts.languageInstruction[language]);
    const json = await this.chat(systemPrompt, userPrompt, PAGE_RESPONSE_SCHEMA);

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
        wantIllustration && typeof parsed.illustrationPrompt === "string"
          ? parsed.illustrationPrompt.trim()
          : undefined,
    };
  }

  private async callTopicModel(userPrompt: string, language: Language): Promise<string[]> {
    const prompts = loadPrompts();
    const systemPrompt = withLanguage(prompts.topicSystemPrompt, prompts.languageInstruction[language]);
    const json = await this.chat(systemPrompt, userPrompt, TOPIC_RESPONSE_SCHEMA);

    let parsed: { topics?: unknown };
    try {
      parsed = JSON.parse(json.message.content);
    } catch {
      throw new TextGenUnavailableError("Ollama returned unparseable topic output");
    }

    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
      : [];

    if (topics.length === 0) {
      throw new TextGenUnavailableError("Ollama returned no topics");
    }

    return topics;
  }

  private async chat(
    systemPrompt: string,
    userPrompt: string,
    schema: object
  ): Promise<{ message: { content: string } }> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          format: schema,
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

    return res.json();
  }
}

function withLanguage(systemPrompt: string, languageInstruction: string): string {
  return languageInstruction ? `${systemPrompt}\n\n${languageInstruction}` : systemPrompt;
}
