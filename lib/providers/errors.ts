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

export class ImageGenTimeoutError extends ImageGenUnavailableError {
  constructor(message = "Image generation timed out") {
    super(message);
    this.name = "ImageGenTimeoutError";
  }
}

export class SpeechGenUnavailableError extends Error {
  constructor(message = "Speech generation backend is unavailable") {
    super(message);
    this.name = "SpeechGenUnavailableError";
  }
}
