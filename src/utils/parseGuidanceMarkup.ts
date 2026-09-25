import { GUIDANCE_LIST_MARKER, GUIDANCE_PARAGRAPH_BREAK } from '../constants/guidanceMarkup.ts';
import type { GuidanceBlock, GuidanceInline } from '../types/guidanceMarkup.ts';

/** Whether a character can sit inside a word, which decides whether an `_` may open or close. */
function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}]/u.test(character);
}

/** Whether `text[index]` is an `_` that can open emphasis: not inside a word, and not before a space. */
function opensEmphasis(text: string, index: number): boolean {
  const next = text[index + 1];
  return !isWordCharacter(text[index - 1]) && next !== undefined && !/\s/.test(next);
}

/** Whether `text[index]` is an `_` that can close emphasis: not inside a word, and not after a space. */
function closesEmphasis(text: string, index: number): boolean {
  const previous = text[index - 1];
  return !isWordCharacter(text[index + 1]) && previous !== undefined && !/\s/.test(previous);
}

/** Where the `_` that closes emphasis opened at `start` sits, or -1 when nothing closes it. */
function emphasisEnd(text: string, start: number): number {
  for (let index = start + 2; index < text.length; index += 1) {
    if (text[index] === '_' && closesEmphasis(text, index)) return index;
  }
  return -1;
}

/**
 * The runs one block’s text is made of.
 *
 * A marker with nothing to close it is kept as the character it is, so a card never loses words to
 * a stray asterisk. `guidanceMarkupProblems` reports that leftover character as a mistake, and the
 * guidance suite runs it over every card, which is what keeps one out of the app.
 */
export function parseGuidanceInlines(text: string): GuidanceInline[] {
  const runs: GuidanceInline[] = [];
  let plain = '';
  const flush = () => {
    if (plain !== '') runs.push({ kind: 'text', text: plain });
    plain = '';
  };

  let index = 0;
  while (index < text.length) {
    const character = text[index] ?? '';
    const marker =
      character === '`' ? '`' : text.startsWith('**', index) ? '**' : character === '_' ? '_' : '';
    const contentStart = index + marker.length;
    const end =
      marker === '_'
        ? opensEmphasis(text, index)
          ? emphasisEnd(text, index)
          : -1
        : marker === ''
          ? -1
          : text.indexOf(marker, contentStart);

    // An unclosed marker, or one closed at once around nothing, is the character it was typed as.
    if (end <= contentStart) {
      plain += character;
      index += 1;
      continue;
    }

    flush();
    const content = text.slice(contentStart, end);
    if (marker === '`') runs.push({ kind: 'code', text: content });
    else if (marker === '**') runs.push({ kind: 'strong', children: parseGuidanceInlines(content) });
    else runs.push({ kind: 'emphasis', children: parseGuidanceInlines(content) });
    index = end + marker.length;
  }

  flush();
  return runs;
}

/**
 * A guidance card’s text, read as the small part of Markdown a card needs: paragraphs split by a
 * blank line, a block whose every line opens with `- ` as a bulleted list, and `` `code` ``,
 * `**bold**` and `_italics_` inside either.
 *
 * Nothing else is Markdown here. There is no HTML, no link and no heading, so no guidance string can
 * put anything on screen but text — which is what lets the card render it without an HTML parser.
 * A single line break inside a paragraph is read as a space.
 */
export function parseGuidanceMarkup(text: string): GuidanceBlock[] {
  return text
    .split(GUIDANCE_PARAGRAPH_BREAK)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .map((block): GuidanceBlock => {
      const lines = block.split('\n');
      if (lines.every((line) => line.startsWith(GUIDANCE_LIST_MARKER))) {
        return {
          kind: 'list',
          items: lines.map((line) => parseGuidanceInlines(line.slice(GUIDANCE_LIST_MARKER.length).trim())),
        };
      }
      return { kind: 'paragraph', children: parseGuidanceInlines(lines.join(' ')) };
    });
}
