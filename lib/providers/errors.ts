export class TextGenUnavailableError extends Error {
  constructor(message = "Text generation backend is unavailable") {
    super(message);
    this.name = "TextGenUnavailableError";
  }
}

export class ImageGenUnavailableError extends Error {
  constructor(message = "Image generation backend is unavailable") {
    super(message);
    this.name = "ImageGenUnavailableError";
  }
}
