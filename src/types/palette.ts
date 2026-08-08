/**
 * A palette the sheet is pinned to — the colour half of "draw this the way a Game Boy could".
 *
 * A palette is not a colour *budget*. `PaletteLimit` says how many colours the sheet may spend;
 * this says **which colours exist**, which is the constraint every machine in the shipped library
 * actually imposed and the one the budget cannot express — no member of `PALETTE_LIMITS` can say
 * "four shades of green" or "exactly these fifty-five".
 *
 * So a pinned palette **supersedes the limit** wherever the two would both apply: the compiled
 * prompt drops the palette-strategy line, the quantiser ignores the colour count, and the studio
 * says as much under the control. One rule, three readers.
 */

/**
 * How a palette says which colours exist.
 *
 * Two kinds because the machines genuinely have two. A Game Boy, a C64 or a PICO-8 has a *list*:
 * someone chose those colours and no arithmetic produces them. A Mega Drive, a SNES or a Master
 * System has a *colour space*: every combination of a few bits per channel, which is 512 or 32,768
 * entries — a list nobody would read and no prompt should carry.
 *
 * `bitsPerChannel` is the whole definition of the second kind. Each channel takes one of
 * `2 ** bitsPerChannel` levels at `round(i × 255 / (levels − 1))`, which is what bit replication
 * produces and what every art tool writes. The measured DAC ramp of a given machine differs
 * slightly from that and varies by console revision and video output, so it describes one machine's
 * analogue behaviour rather than the palette — the ladder is the palette.
 */
export type PaletteSpace =
  | {
      readonly kind: 'FIXED';
      /** `#RRGGBB`, upper case, in the machine's own order. */
      readonly entries: readonly string[];
    }
  | { readonly kind: 'CHANNEL_DEPTH'; readonly bitsPerChannel: number };

/**
 * Every palette the studio offers, `FREE` first.
 *
 * `FREE` is a member rather than `palette: PaletteId | null` because this is a `SelectField` value
 * and the control needs something to render — the same reason `RIG_MODE` carries a `NONE`. It maps
 * to `null` in `PALETTES`, so "no palette" is expressed once, in the lookup, rather than at every
 * call site.
 *
 * Ordered by family, which is the order the dropdown shows: the two Nintendo handhelds, the
 * consoles, the home computers, the PC standards, and the one fantasy console. A machine whose
 * colour space is shared with another still gets its own entry — the Master System and EGA have the
 * same 64 colours, and a prompt that names the wrong one of them is a prompt about the wrong
 * machine.
 */
export const PALETTE_IDS = [
  'FREE',
  'GAME_BOY_DMG',
  'GAME_BOY_MONO',
  'GAME_BOY_COLOR',
  'NES',
  'SNES',
  'MASTER_SYSTEM',
  'MEGA_DRIVE',
  'GAME_GEAR',
  'PC_ENGINE',
  'NEO_GEO',
  'COMMODORE_64',
  'ZX_SPECTRUM',
  'AMIGA_OCS',
  'ATARI_ST',
  'ATARI_2600_NTSC',
  'CGA_MODE_4',
  'EGA_16',
  'VGA_256',
  'PICO_8',
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

/** One palette's whole definition. */
export interface Palette {
  readonly id: PaletteId;
  /**
   * The machine, as the prompt names it.
   *
   * This is the half a generator can act on from knowledge alone — "the original Game Boy" carries
   * more than four hex values do — so it is stated as well as the colours, never instead of them.
   */
  readonly name: string;
  /**
   * The dropdown's own wording, at most 50 characters.
   *
   * The name plus what the machine's colour amounts to. Unlike every other select in the studio this
   * does **not** lead with the stored identifier: the identifier never reaches the prompt here — the
   * name does — so showing `MEGA_DRIVE` would be showing the one string that has no bearing on the
   * output. `tests/select-option-labels.test.ts` enforces the budget.
   */
  readonly label: string;
  readonly space: PaletteSpace;
  /**
   * How many distinct colours may appear across the whole sheet, or `null` where the machine sets no
   * such limit.
   *
   * A per-*frame* figure on the real hardware. A sprite sheet is not a frame — it is the source
   * artwork a frame is later assembled from — so this is stated to the generator and deliberately
   * not enforced by the quantiser, which has no way to know which components would ever be on
   * screen together.
   */
  readonly onScreenColors: number | null;
  /**
   * How many colours one component may carry, transparency excluded, or `null` on a machine with no
   * hardware sprites to impose one.
   *
   * The constraint that shapes retro sprite art more than any other: three colours per object is why
   * a Game Boy or NES sprite reads the way it does, and a sheet drawn to the *sheet* limit alone
   * looks nothing like it.
   */
  readonly colorsPerComponent: number | null;
  /**
   * One sentence of structure, stated after the colours.
   *
   * What the entries or the ladder cannot say: how the machine divided its palette up — sub-palettes
   * per sprite, an attribute cell, a shared backdrop entry.
   */
  readonly note: string;
}
