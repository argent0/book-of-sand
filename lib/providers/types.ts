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

export interface TextGenProvider {
  generatePage(params: GeneratePageParams): Promise<GeneratedPage>;
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
