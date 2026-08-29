export type Direction = "forward" | "backward";
export type JumpSize = "small" | "medium" | "large";
export type Mode = "direct" | "structured";
export type Language = "en" | "es";

export interface SkeletonState {
  topics: string[];
  currentIndex: number;
}

export interface GeneratePageParams {
  currentPageText: string | null;
  direction: Direction;
  jumpSize: JumpSize;
  wantIllustration: boolean;
  mode: Mode;
  language: Language;
  skeleton: SkeletonState | null;
}

export interface GeneratedPage {
  text: string;
  pageNumber: string;
  illustrationPrompt?: string;
  skeleton?: SkeletonState;
}

export interface TranslatePageParams {
  text: string;
  language: Language;
}

export interface TextGenProvider {
  generatePage(params: GeneratePageParams): Promise<GeneratedPage>;
  translatePage(params: TranslatePageParams): Promise<string>;
}

export interface GenerateImageParams {
  prompt: string;
}

export interface GeneratedImage {
  dataUrl: string;
  inferMs?: number;
}

export interface ImageGenProvider {
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
}

export interface SynthesizeSpeechParams {
  text: string;
  language: Language;
}

export interface SynthesizedSpeech {
  audio: ArrayBuffer;
  contentType: string;
}

export interface SpeechProvider {
  synthesizeSpeech(params: SynthesizeSpeechParams): Promise<SynthesizedSpeech>;
}
