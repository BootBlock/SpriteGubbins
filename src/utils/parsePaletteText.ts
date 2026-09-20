import type { Rgba } from '../types/quantiser.ts';
import { FULLY_OPAQUE, fromHex, toHex } from './imageData.ts';

/**
 * A palette read back out of the two text forms this app writes.
 *
 * The inverse of `paletteText.ts`, and deliberately its neighbour: `gplText` and `hexListText` write
 * the files and these read them, so a palette exported from the Quantise tab can be pinned in the
 * studio without passing through anything else. Both forms arrive through one function because a
 * reader does not think of them as two — they have a palette, and it is in a file or on the
 * clipboard.
 *
 * **What it accepts is wider than what this app writes**, because a `.gpl` is a GIMP, Aseprite and
 * Krita format before it is one of ours and a hex list is as likely to be pasted off a palette site
 * as saved from here. So each form is read the way its own writers write it: a `.gpl` entry is three
 * decimal channels followed by a name this app has no use for, and a hex list is six hex digits a
 * line with or without the `#`.
 *
 * **A line that states no colour is reported, never skipped.** A reader whose palette came back
 * three colours short needs to know which three lines were not understood, and a parser that
 * silently drops what it cannot read pins an incomplete palette while looking as though it worked.
 *
 * Pure, as everything in this directory is.
 */

/** What a `.gpl` opens with. The magic line is what tells the two forms apart. */
const GPL_MAGIC = 'GIMP Palette';

/** `Name: Dusk Harbour` in a `.gpl` header — the palette's own name, where the file carries one. */
const GPL_NAME = /^Name:\s*(.+)$/;

/** A `.gpl` entry: three decimal channels, then whatever the writing tool called that colour. */
const GPL_ENTRY = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s|$)/;

/**
 * Six hex digits, with or without a leading `#`, not run together with more of them.
 *
 * The boundaries are what stop the middle of a longer run matching: `#FF00FF00` is eight digits and
 * is not two colours.
 */
const HEX_COLOR = /(?<![#0-9A-Fa-f])#?([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;

/** How many unreadable lines are named before the report stops listing them one by one. */
const PROBLEMS_LISTED = 5;

/** A palette read out of text: what it is called, what is in it, and what would not read. */
export interface PaletteTextReading {
  /** The name the text states, or `fallbackName` where it states none. */
  readonly name: string;
  /** The colours as `#RRGGBB`, deduplicated, in the order the text listed them. */
  readonly entries: readonly string[];
  /** Every line that stated no colour, in the words the studio will show. */
  readonly problems: readonly string[];
}

/**
 * The palette in `text`, whichever of the two forms it is written in.
 *
 * `fallbackName` is what the palette is called where the text does not say — the file's own stem, or
 * the studio's word for something pasted. The caller decides it because only the caller knows where
 * the text came from.
 */
export function parsePaletteText(text: string, fallbackName: string): PaletteTextReading {
  const lines = text.split(/\r?\n/);
  const gpl = lines[0]?.trimStart().startsWith(GPL_MAGIC) === true;

  const seen = new Set<string>();
  const problems: string[] = [];
  let name = fallbackName;

  lines.forEach((line, index) => {
    const body = line.trim();
    if (body === '') return;

    if (gpl && isHeader(body)) {
      const stated = GPL_NAME.exec(body)?.[1]?.trim();
      if (stated !== undefined && stated !== '') name = stated;
      return;
    }

    const colors = gpl ? gplEntry(body) : hexColors(body);
    if (colors.length === 0) {
      problems.push(`Line ${String(index + 1)} states no colour: ${quote(body)}`);
      return;
    }

    // Spelled through `toHex` rather than assembled here, so a palette pinned from a file writes its
    // colours the way every other colour in the app is written.
    for (const color of colors) seen.add(toHex(color));
  });

  return { name, entries: [...seen], problems: listed(problems) };
}

/**
 * A `.gpl` entry's colour, or nothing where the line is not one.
 *
 * The channels are decimal and the name after them is free text, which is why this cannot be the hex
 * reading below: GIMP writes `255   0   0 Red`, and a parser looking for hex digits finds none on it
 * and loses the colour. A channel past 255 is a line this reader does not understand rather than a
 * colour to clamp — clamping would invent one the file does not state.
 */
function gplEntry(body: string): readonly Rgba[] {
  const match = GPL_ENTRY.exec(body);
  if (match === null) return [];

  const [r = 0, g = 0, b = 0] = match.slice(1, 4).map(Number);
  if (r > 255 || g > 255 || b > 255) return [];
  return [{ r, g, b, a: FULLY_OPAQUE }];
}

/**
 * Every colour a hex list's line states, in the order it states them.
 *
 * A line rather than an entry, because a pasted list is as often comma-separated on one line as it
 * is one colour a line. `fromHex` cannot refuse what the expression matched, and the `null` check is
 * how that is said in types rather than a case that arises.
 */
function hexColors(body: string): readonly Rgba[] {
  return [...body.matchAll(HEX_COLOR)]
    .map(([, digits]) => fromHex(`#${String(digits)}`))
    .filter((color): color is Rgba => color !== null);
}

/**
 * Whether a `.gpl` line is header rather than an entry.
 *
 * The magic line, the two documented headers, and the `#` comment the format ends its header with.
 * Applied **only inside a `.gpl`**: a lone `#` opens a comment there, while in a hex list it opens a
 * colour, and a parser applying the one rule to the other file drops every entry.
 */
function isHeader(body: string): boolean {
  return (
    body.startsWith(GPL_MAGIC) ||
    body.startsWith('Name:') ||
    body.startsWith('Columns:') ||
    body.startsWith('#')
  );
}

/** A problem line's offending text, kept short so one long line cannot fill the panel. */
function quote(body: string): string {
  return `“${body.length > 40 ? `${body.slice(0, 40)}…` : body}”`;
}

/**
 * The first few problems, and a count of the rest.
 *
 * A file in the wrong format states no colour on any of its lines, so the unabridged list is as long
 * as the file. Five lines is enough to see what went wrong, and the count is what says how much of
 * it did.
 */
function listed(problems: readonly string[]): readonly string[] {
  if (problems.length <= PROBLEMS_LISTED) return problems;
  const rest = problems.length - PROBLEMS_LISTED;
  return [
    ...problems.slice(0, PROBLEMS_LISTED),
    `…and ${String(rest)} further ${rest === 1 ? 'line' : 'lines'} that state no colour.`,
  ];
}
