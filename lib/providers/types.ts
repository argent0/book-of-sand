export type Direction = "forward" | "backward";
export type JumpSize = "small" | "medium" | "large";

export interface GeneratePageParams {
  currentPageText: string | null;
  direction: Direction;
  jumpSize: JumpSize;
  wantIllustration: boolean;
}

export interface GeneratedPage {
  text: string;
  pageNumber: string;
  illustrationPrompt?: string;
}

export interface TextGenProvider {
  generatePage(params: GeneratePageParams): Promise<GeneratedPage>;
}

export interface GenerateImageParams {
  prompt: string;
}

export interface GeneratedImage {
  dataUrl: string;
}

export interface ImageGenProvider {
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
}
