import fs from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import type { JumpSize } from "../providers/types";

export interface PromptText {
  proseSystemPrompt: string;
  topicSystemPrompt: string;
  proseDriftInstruction: Record<JumpSize, string>;
  topicDriftInstruction: Record<JumpSize, string>;
  openingPageInstruction: string;
  numberingIndependenceInstruction: string;
  topicVoiceReferencePrefix: string;
  inventStartTopicInstruction: string;
  pageQuoteIntro: string;
  illustrationStylePrefix: string;
  illustrationNegativePrompt: string;
}

const PROMPTS_PATH = path.join(process.cwd(), "config", "prompts.yaml");

const REQUIRED_KEYS: (keyof PromptText)[] = [
  "proseSystemPrompt",
  "topicSystemPrompt",
  "proseDriftInstruction",
  "topicDriftInstruction",
  "openingPageInstruction",
  "numberingIndependenceInstruction",
  "topicVoiceReferencePrefix",
  "inventStartTopicInstruction",
  "pageQuoteIntro",
  "illustrationStylePrefix",
  "illustrationNegativePrompt",
];
const JUMP_SIZES: JumpSize[] = ["small", "medium", "large"];

/**
 * Reads and parses config/prompts.yaml fresh on every call — no module-level
 * caching — so editing the file takes effect immediately, without a rebuild
 * or dev-server restart.
 */
export function loadPrompts(): PromptText {
  let raw: string;
  try {
    raw = fs.readFileSync(PROMPTS_PATH, "utf-8");
  } catch (err) {
    throw new Error(`Could not read prompt config at ${PROMPTS_PATH}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(`Could not parse ${PROMPTS_PATH} as YAML: ${(err as Error).message}`);
  }

  return validate(parsed);
}

function validate(parsed: unknown): PromptText {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${PROMPTS_PATH} must contain a YAML mapping.`);
  }
  const obj = parsed as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) {
      throw new Error(`${PROMPTS_PATH} is missing required key "${key}".`);
    }
  }

  for (const key of ["proseDriftInstruction", "topicDriftInstruction"] as const) {
    const table = obj[key];
    if (typeof table !== "object" || table === null) {
      throw new Error(`${PROMPTS_PATH}: "${key}" must be a mapping of small/medium/large.`);
    }
    for (const size of JUMP_SIZES) {
      if (typeof (table as Record<string, unknown>)[size] !== "string") {
        throw new Error(`${PROMPTS_PATH}: "${key}.${size}" must be a string.`);
      }
    }
  }

  for (const key of REQUIRED_KEYS) {
    if (key === "proseDriftInstruction" || key === "topicDriftInstruction") continue;
    if (typeof obj[key] !== "string") {
      throw new Error(`${PROMPTS_PATH}: "${key}" must be a string.`);
    }
  }

  return obj as unknown as PromptText;
}
