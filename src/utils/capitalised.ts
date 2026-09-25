/**
 * The text with its first letter in upper case and the rest untouched — `Twenty-six`, `Root masses`,
 * `Front-three-quarter, right side`.
 *
 * The first letter alone, so a compound or a list stays a sentence rather than becoming a title.
 */
export function capitalised(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
