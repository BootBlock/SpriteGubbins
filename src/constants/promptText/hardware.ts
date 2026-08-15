import type { HardwareProfile } from '../../types/hardware.ts';
import type { Palette } from '../../types/palette.ts';
import { channelLevels, channelSpaceSize } from '../../utils/channelLevels.ts';

/**
 * The two blocks a targeted machine adds to section 2 of the prompt.
 *
 * Composed rather than looked up, which is why neither token is named `…_DESCRIPTION`: the palette
 * block is four paragraphs assembled from whichever of a palette's limits exist, and no fixed map
 * could hold it. `describeDirections` is the same shape of exception one file over.
 *
 * **Geometry and colour never overlap here**, exactly as they do not overlap in the two libraries
 * these read from. `describeHardware` says nothing about colour and `describePalette` says nothing
 * about size, so a Mega Drive profile carrying a Game Boy palette produces two blocks that are both
 * true rather than two that argue.
 */

/** How many colours a line of the entry list carries, so the block wraps like the rest of the prompt. */
const ENTRIES_PER_LINE = 8;

/** The machine's structural limits, one per line, as the template's bullet list. */
export function describeHardware(profile: HardwareProfile): string {
  return profile.constraints.map((constraint) => `- ${constraint}`).join('\n');
}

/**
 * What the palette permits, as the block that follows its heading.
 *
 * Three parts, in the order a reader needs them: the rule that says which colours exist at all, the
 * counts that bound how many may be used, and the machine's own structure. Each is omitted where the
 * palette has nothing to say — a `null` limit is a machine that imposed none, and stating "no more
 * than null colours" would be worse than saying nothing.
 *
 * **The background field is excluded throughout**, because it has to be: section 0 fixes it as the
 * key colour, and the recommended magenta is in none of these palettes. Every sentence here is about
 * the components.
 */
export function describePalette(palette: Palette): string {
  const parts = [rule(palette), ...limits(palette), palette.note];
  return parts.join('\n\n');
}

/**
 * Which colours exist, what to do about a subject colour that is not among them, and — where the
 * entries are a rendering rather than the machine's own values — what they actually are.
 *
 * **The caveat weakens the claim, never the constraint.** Most of these machines held no RGB colour
 * at all, so telling a generator that four greens are "the colours of the original Game Boy" invites
 * it to improve on them from knowledge of hardware that has nothing to improve on. What the hedge
 * may not do is leave any doubt that the sheet is drawn in exactly these entries — so only the
 * *ownership* clause varies, and the caveat lands after the list, closing on the instruction rather
 * than on the doubt. It goes last in its own sentence too, because `approximates` ends several of
 * these on an em-dash clause and interpolating it mid-sentence read as a run-on.
 */
function rule(palette: Palette): string {
  const nearest =
    'Where section 1 names a colour this palette does not hold, use the nearest entry it does — never mix, tint or dither one to approximate it. The background field is the exception: it stays the key colour section 0 fixes, and is not drawn from this palette.';

  if (palette.space.kind === 'FIXED') {
    const { entries, approximates } = palette.space;
    const count = String(entries.length);
    const whose = approximates === null ? ` of ${palette.name}` : '';

    return [
      `Every pixel of every component is exactly one of the ${count} colours${whose}, listed below. No other colour appears on any component — not as a gradient, a blend, or an anti-aliased edge.`,
      nearest,
      formatEntries(entries),
      ...(approximates === null
        ? []
        : [
            `The ${count} values above are an sRGB approximation of ${approximates}. They are a rendering for a modern display, not colour values ${palette.name} holds. Draw in them exactly as listed — on this sheet they are the colours.`,
          ]),
    ].join('\n\n');
  }

  const levels = channelLevels(palette.space.bitsPerChannel);
  const total = channelSpaceSize(palette.space.bitsPerChannel);
  return [
    `Every pixel of every component is a colour ${palette.name} could actually show: red, green and blue each take one of ${String(levels.length)} levels — ${levels.join(', ')} — and no value between them exists, which is ${String(total)} colours in all.`,
    nearest,
  ].join('\n\n');
}

/**
 * The two count limits, each stated only where it is **tighter than what has already been said**.
 *
 * That is the whole rule, and it has to be that rather than "state it if it is not null", because
 * `rule()` above has already given a number for a fixed palette: on seven of the nine, the whole
 * sheet may use every entry there is, so a bare on-screen line produced *"exactly one of the 4
 * colours … No more than 4 distinct colours appear across the whole sheet"* — two constraints that
 * happen to agree, one of them buying nothing.
 *
 * The per-component line is measured against whichever sheet-wide figure the reader has actually
 * been given, so it survives on a machine whose sheet limit was suppressed (the Game Boy: four
 * colours listed, three per object) and disappears where it would only restate one.
 *
 * Both are stated flatly, with no gloss on what they do to the artwork. An earlier version explained
 * that form has to come from shape rather than shading, which is true of a three-colour Game Boy
 * object and plainly false of a fifteen-colour Mega Drive sprite — one sentence cannot serve a range
 * that wide, and each machine's own `note` is where that difference is already described.
 */
function limits(palette: Palette): readonly string[] {
  const lines: string[] = [];

  const sheet = sheetLimit(palette);
  if (sheet !== null) {
    lines.push(`No more than ${String(sheet)} distinct colours appear across the whole sheet.`);
  }

  const component = perComponentLimit(palette);
  if (component !== null) {
    lines.push(
      `No single component carries more than ${String(component)} of them at once, whichever of them it takes.`,
    );
  }
  return lines;
}

/** How many colours the palette lists, or `null` where it is a space rather than a list. */
function available(palette: Palette): number | null {
  return palette.space.kind === 'FIXED' ? palette.space.entries.length : null;
}

/** The whole-sheet cap worth stating, or `null` where `rule()` has already given that number. */
function sheetLimit(palette: Palette): number | null {
  const { onScreenColors } = palette;
  return onScreenColors !== null && onScreenColors !== available(palette) ? onScreenColors : null;
}

/**
 * The per-component cap this palette actually **states**, or `null` where it states none.
 *
 * Exported because the self-audit cites it: *"no component carries more colours than that section
 * allows it"* is a check the reader cannot perform when no allowance was given, and seven of the
 * nineteen palettes give none. The compiler gates that clause on this, so the two cannot disagree
 * about whether the number the audit refers to was ever printed.
 */
export function perComponentLimit(palette: Palette): number | null {
  const { colorsPerComponent } = palette;
  if (colorsPerComponent === null) return null;
  // Measured against whichever sheet-wide figure the reader has actually been given, so it survives
  // on a machine whose sheet limit was suppressed — the Game Boy lists four colours and allows three
  // per object — and disappears where it would only restate one.
  const ceiling = sheetLimit(palette) ?? available(palette) ?? palette.onScreenColors;
  return ceiling === null || colorsPerComponent < ceiling ? colorsPerComponent : null;
}

/** The hex entries, wrapped so no line runs past the width the rest of the prompt is written to. */
function formatEntries(entries: readonly string[]): string {
  const lines: string[] = [];
  for (let index = 0; index < entries.length; index += ENTRIES_PER_LINE) {
    lines.push(entries.slice(index, index + ENTRIES_PER_LINE).join('  '));
  }
  return lines.join('\n');
}
