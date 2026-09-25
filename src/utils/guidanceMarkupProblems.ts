import { GUIDANCE_LIST_MARKER, GUIDANCE_PARAGRAPH_BREAK } from '../constants/guidanceMarkup.ts';
import type { GuidanceInline } from '../types/guidanceMarkup.ts';
import { parseGuidanceMarkup } from './parseGuidanceMarkup.ts';

/** The characters that mean markup, and so should never reach a card as text. */
const MARKERS = ['`', '*', '_'] as const;

/** Every stray marker left in these runs as plain text, where the parser could not pair it. */
function strayMarkers(runs: readonly GuidanceInline[]): string[] {
  return runs.flatMap((run) => {
    if (run.kind === 'code') return [];
    if (run.kind !== 'text') return strayMarkers(run.children);
    return MARKERS.filter((marker) => run.text.includes(marker)).map(
      (marker) => `an unpaired ${marker} in “${run.text}”`,
    );
  });
}

/**
 * What is wrong with a guidance card’s markup, as sentences a failing test can print.
 *
 * The parser forgives all of these, because a card on screen should show its words rather than
 * nothing. That is why the check is separate: forgiven markup is a card that shows an asterisk, and
 * an option name such as HIGH_RESOLUTION left outside backticks is a card that could show emphasis
 * the author never meant.
 */
export function guidanceMarkupProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\n{3,}/.test(text)) problems.push('more than one blank line between two blocks');

  for (const block of text.split(GUIDANCE_PARAGRAPH_BREAK)) {
    const lines = block.split('\n');
    if (lines.length > 1 && !lines.every((line) => line.startsWith(GUIDANCE_LIST_MARKER))) {
      problems.push(`a line break inside a paragraph: “${lines[0] ?? ''}”`);
    }
    if (lines.some((line) => line.trim() !== line)) problems.push('a line that opens or ends with a space');
  }

  for (const block of parseGuidanceMarkup(text)) {
    const runs = block.kind === 'paragraph' ? [block.children] : block.items;
    problems.push(...runs.flatMap(strayMarkers));
  }

  return problems;
}
