import type { Rgba } from '../types/quantiser.ts';
import { toHex } from './imageData.ts';

/**
 * A palette as text, in the two forms other tools actually read.
 *
 * A swatch picture is what an engine importer wants and is unreadable by a person, so a settled
 * palette leaves the app as words as well. There are two of those and they answer different
 * questions: `.gpl` is the interchange format Aseprite, GIMP, Krita and most pixel editors open, and
 * a bare list of hex is what goes into a prompt, a shader constant or another application’s colour
 * field.
 *
 * **Both are written in ASCII with `\n` line endings**, which is what every reader of these formats
 * expects — the typographic punctuation the rest of the app’s copy is set in belongs to prose shown
 * on screen, and a curly quote in a palette name would reach a parser that has no opinion about
 * typography and every opinion about bytes.
 *
 * Pure, as everything in this directory is.
 */

/** What a `.gpl` file opens with — the magic line every reader of the format looks for. */
const GPL_MAGIC = 'GIMP Palette';

/**
 * The palette as a GIMP palette file.
 *
 * The format is four header lines and then one entry per line: three decimal channels, then the
 * entry’s name. The channels are padded to three columns and separated by single spaces, which is
 * what the tools that write these files emit and what the ones that read them are tested against.
 *
 * **Every entry is named for its own hex**, because these colours have no names. A palette taken off
 * a returned sheet is a list of things a generator drew, not a designer’s swatch book, so inventing
 * `Colour 7` would put a label in the editor that says less than the value it hides.
 *
 * `Columns: 0` lets the reading application lay the swatches out however it likes. Any other figure
 * would be this app deciding the shape of a grid it is not drawing.
 */
export function gplText(name: string, entries: readonly Rgba[]): string {
  const lines = [GPL_MAGIC, `Name: ${name}`, 'Columns: 0', '#'];

  for (const entry of entries) {
    const channels = [entry.r, entry.g, entry.b].map((channel) => String(channel).padStart(3, ' '));
    lines.push(`${channels.join(' ')}\t${toHex(entry)}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * The palette as one `#RRGGBB` per line, and nothing else.
 *
 * No header and no count, because everything that reads this reads it by pasting: into a prompt, a
 * spreadsheet, a shader, a colour field. A line of commentary at the top is a line the reader has to
 * delete every time. `toHex` decides the spelling, so this list and every swatch title in the app
 * write a colour the same way.
 */
export function hexListText(entries: readonly Rgba[]): string {
  return entries.map((entry) => `${toHex(entry)}\n`).join('');
}
