const VALID_PAGE_NUMBER = /^[1-9][0-9]{0,5}$/;

export function isValidPageNumber(value: unknown): value is string {
  return typeof value === "string" && VALID_PAGE_NUMBER.test(value);
}

export function randomPageNumber(): string {
  return String(1 + Math.floor(Math.random() * 999999));
}
