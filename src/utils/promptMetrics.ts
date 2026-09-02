/**
 * What a finished prompt measures, for the preview's two figures.
 *
 * Separate from `promptCompiler.ts` because neither of these compiles anything: each takes the
 * string that came out and counts something in it, and neither knows what a category, a sheet or
 * a target model is. They are the only part of the old compiler module a caller could use without
 * a studio configuration in hand.
 */

/** Words in the compiled prompt, as the preview counts them. */
export function countWords(prompt: string): number {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * A rough token estimate at the usual ~4-characters-per-token heuristic. Deliberately labelled as an
 * estimate in the UI — no tokeniser ships with the app, and the real count depends on which model
 * reads it.
 */
export function estimateTokens(prompt: string): number {
  return Math.round(prompt.length / 4);
}
