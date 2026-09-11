import type { HardwareProfile } from '../../types/hardware.ts';
import type { Palette } from '../../types/palette.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { channelLevels, channelSpaceSize } from '../../utils/channelLevels.ts';
import { fromHex, toHex } from '../../utils/imageData.ts';
import { keyReaches } from '../../utils/keyReach.ts';

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
 * **The background key is kept apart from the palette in both directions**, and `key` is what that
 * takes — the key's colour, or `null` for a transparent field, which has no colour to keep apart.
 *
 * - **The field is not drawn from the palette.** Section 0 fixes it as the key colour whether or not
 *   the palette holds that colour, so every sentence here is about the components and the exception
 *   is stated in as many words.
 * - **No component is drawn in the key.** That half was missing for as long as the first one was
 *   there (#277), and the palettes are why it mattered: the ZX Spectrum's bright magenta is the
 *   recommended key exactly, every channel-depth ladder runs from 0 to 255 in each channel and so
 *   reaches all three opaque keys, and eight of the nine fixed lists hold black. A block listing the
 *   key as an entry told the generator a component could wear the one colour the sheet is cut out
 *   by. So a fixed list leaves out every entry `keyReaches` takes — the key itself and anything the
 *   Quantise tab would key out with it — names them, and counts only what is left; a colour space,
 *   which has no list to take them from, says so of the key and its neighbours instead.
 *
 * **The Quantise tab keeps every entry**, and that is not the two disagreeing. It maps a returned
 * sheet onto the palette *after* keying, when the field is already transparent and a key-coloured
 * pixel means nothing — and with keying off the field itself is what should take the key's entry.
 */
export function describePalette(palette: Palette, key: Rgba | null): string {
  const parts = [rule(palette, key), ...limits(palette, key), palette.note];
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
 *
 * **Ownership is claimed only of a whole list.** "One of the 15 colours of PICO-8" is untrue of a
 * machine with sixteen, so where the key has taken an entry the clause goes and the sentence naming
 * what was left out says the rest. The withheld entries are named rather than silently dropped for
 * the reason the caveat exists: a generator that knows the machine would otherwise put them back.
 */
function rule(palette: Palette, key: Rgba | null): string {
  const nearest =
    'Where section [SEC:SUBJECT] names a colour this block does not allow, use the nearest colour it does — never mix, tint or dither one to approximate it. The background field is the exception: it stays the key colour section [SEC:CONTRACT] fixes, and is not drawn from this palette.';

  if (palette.space.kind === 'FIXED') {
    const { approximates } = palette.space;
    const { offered, withheld } = partitionEntries(palette.space.entries, key);
    const count = String(offered.length);
    const whose = approximates === null && withheld.length === 0 ? ` of ${palette.name}` : '';

    return [
      `Every pixel of every component is exactly one of the ${count} colours${whose}, listed below. No other colour appears on any component — not as a gradient, a blend, or an anti-aliased edge.`,
      ...(key === null || withheld.length === 0 ? [] : [withheldSentence(withheld, key)]),
      nearest,
      formatEntries(offered),
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
    ...(key === null
      ? []
      : [
          `No component takes the background key section [SEC:CONTRACT] fixes, ${toHex(key)}, or any colour near enough to it to be taken for it.`,
        ]),
    nearest,
  ].join('\n\n');
}

/**
 * A fixed list split by whether the background key takes each entry, both halves in the machine's
 * own order. A transparent field takes nothing.
 *
 * An entry that will not parse stays offered rather than vanishing from the prompt: the list is
 * text here, and the library's own suite is what checks every literal parses.
 */
function partitionEntries(
  entries: readonly string[],
  key: Rgba | null,
): { readonly offered: readonly string[]; readonly withheld: readonly string[] } {
  if (key === null) return { offered: entries, withheld: [] };

  const offered: string[] = [];
  const withheld: string[] = [];
  for (const entry of entries) {
    const color = fromHex(entry);
    (color !== null && keyReaches(key, color) ? withheld : offered).push(entry);
  }
  return { offered, withheld };
}

/**
 * The sentence naming what the key took out of a fixed list, and why each one went.
 *
 * Three shapes, because an entry goes for one of two reasons and saying the wrong one is a false
 * statement about a colour: the key itself, a colour near enough to it to be taken for it, or both
 * in one list — the Spectrum under magenta, which loses `#FF00FF` and `#D800D8` together.
 */
function withheldSentence(withheld: readonly string[], key: Rgba): string {
  const keyHex = toHex(key);
  const near = withheld.filter((entry) => entry.toUpperCase() !== keyHex);
  // The key leads wherever the list holds it, so the reasons that follow come in the order the
  // entries were named — the Spectrum lists its dim magenta before its bright one.
  const named = near.length === withheld.length ? near : [keyHex, ...near];
  const opening = `${spokenList(named)} ${named.length === 1 ? 'is' : 'are'} left out of the list below, because`;

  if (near.length === withheld.length) {
    return `${opening} ${withheld.length === 1 ? 'it is' : 'each is'} near enough to the background key section [SEC:CONTRACT] fixes to be taken for it.`;
  }
  if (near.length === 0) return `${opening} it is the background key section [SEC:CONTRACT] fixes.`;
  return `${opening} ${keyHex} is the background key section [SEC:CONTRACT] fixes and ${spokenList(near)} ${near.length === 1 ? 'is' : 'are'} near enough to it to be taken for it.`;
}

/** `A`, `A and B`, `A, B and C`. */
function spokenList(items: readonly string[]): string {
  const last = items.at(-1) ?? '';
  return items.length < 2 ? last : `${items.slice(0, -1).join(', ')} and ${last}`;
}

/**
 * The two count limits, each stated only where it is **tighter than what has already been said**.
 *
 * That is the whole rule, and it has to be that rather than "state it if it is not null", because
 * `rule()` above has already given a number for a fixed palette: on seven of the nine, the whole
 * sheet may use every entry there is, so a bare on-screen line produced *"exactly one of the 4
 * colours … No more than 4 distinct colours appear across the whole sheet"* — two constraints that
 * happen to agree, one of them buying nothing. The number already given is the count *after* the key
 * has taken its entries, so a Spectrum under magenta, offered 13, is not then told it may use 15.
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
function limits(palette: Palette, key: Rgba | null): readonly string[] {
  const lines: string[] = [];

  const sheet = sheetLimit(palette, key);
  if (sheet !== null) {
    lines.push(`No more than ${String(sheet)} distinct colours appear across the whole sheet.`);
  }

  const component = perComponentLimit(palette, key);
  if (component !== null) {
    lines.push(
      `No single component carries more than ${String(component)} of them at once, whichever of them it takes.`,
    );
  }
  return lines;
}

/** How many colours the block lists once the key has taken its share, or `null` where it is a space. */
function available(palette: Palette, key: Rgba | null): number | null {
  return palette.space.kind === 'FIXED' ? partitionEntries(palette.space.entries, key).offered.length : null;
}

/** The whole-sheet cap worth stating, or `null` where `rule()` has already given a number as tight. */
function sheetLimit(palette: Palette, key: Rgba | null): number | null {
  const { onScreenColors } = palette;
  if (onScreenColors === null) return null;
  const listed = available(palette, key);
  return listed === null || onScreenColors < listed ? onScreenColors : null;
}

/**
 * The per-component cap this palette actually **states** under this key, or `null` where it states
 * none.
 *
 * Exported because the self-audit cites it: *"no component carries more colours than that section
 * allows it"* is a check the reader cannot perform when no allowance was given, and seven of the
 * nineteen palettes give none. The compiler gates that clause on this, so the two cannot disagree
 * about whether the number the audit refers to was ever printed. It takes the key for the same
 * reason — the Game Boy's grey list under a black key offers three colours, so its three per object
 * restates the list and is not printed.
 */
export function perComponentLimit(palette: Palette, key: Rgba | null): number | null {
  const { colorsPerComponent } = palette;
  if (colorsPerComponent === null) return null;
  // Measured against whichever sheet-wide figure the reader has actually been given, so it survives
  // on a machine whose sheet limit was suppressed — the Game Boy lists four colours and allows three
  // per object — and disappears where it would only restate one.
  const ceiling = sheetLimit(palette, key) ?? available(palette, key) ?? palette.onScreenColors;
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
