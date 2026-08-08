import type { Palette, PaletteId } from '../../types/palette.ts';

/**
 * The home computers: two fixed sixteen-and-fifteen colour sets, and two colour spaces.
 *
 * **Where the hex values come from.** Both fixed sets are Lospec's published palettes. Neither
 * machine emitted RGB — the VIC-II and the ULA drove composite and RF — so every table for them is
 * one measurement of an analogue signal among several, and the C64's in particular has at least
 * three well-known renderings that disagree by a visible amount. Taking a published one keeps this
 * file out of that argument.
 *
 * The Spectrum's fifteen rather than sixteen is not an omission: its two brightness levels give
 * eight colours each, and black is black at both.
 */

const COMMODORE_64: Palette = {
  id: 'COMMODORE_64',
  name: 'the Commodore 64',
  label: 'Commodore 64 — 16 fixed colours',
  space: {
    kind: 'FIXED',
    approximates:
      'the composite signal the VIC-II drives, which at least three well-known renderings of this palette disagree about by a visible amount',
    entries: [
      '#000000',
      '#626262',
      '#898989',
      '#ADADAD',
      '#FFFFFF',
      '#9F4E44',
      '#CB7E75',
      '#6D5412',
      '#A1683C',
      '#C9D487',
      '#9AE29B',
      '#5CAB5E',
      '#6ABFC6',
      '#887ECB',
      '#50459B',
      '#A057A3',
    ],
  },
  onScreenColors: 16,
  colorsPerComponent: 3,
  // The multicolour pixel's shape belongs to the *profile*, which states it, and stating it here too
  // is how a Mega Drive profile carrying this palette emitted two contradictory pixel aspects into
  // one section. `palettes.test.ts` now refuses geometry in a note, as `hardware.test.ts` refuses
  // colour in a constraint.
  note: 'A multicolour sprite carries three colours plus transparency, two of them shared with every other sprite on screen.',
};

const ZX_SPECTRUM: Palette = {
  id: 'ZX_SPECTRUM',
  name: 'the ZX Spectrum',
  label: 'ZX Spectrum — 15 fixed colours',
  space: {
    kind: 'FIXED',
    approximates:
      'the composite signal the ULA drives, whose eight hues at two brightness levels reach a screen as voltages rather than as a colour table',
    entries: [
      '#000000',
      '#0000D8',
      '#0000FF',
      '#D80000',
      '#FF0000',
      '#D800D8',
      '#FF00FF',
      '#00D800',
      '#00FF00',
      '#00D8D8',
      '#00FFFF',
      '#D8D800',
      '#FFFF00',
      '#D8D8D8',
      '#FFFFFF',
    ],
  },
  onScreenColors: 15,
  // No hardware sprites at all — everything is drawn into the bitmap — so the limit that shapes the
  // art is the attribute cell in `note` rather than anything per component.
  colorsPerComponent: null,
  note: 'Every 8 × 8 pixel cell holds exactly two colours, an ink and a paper, and both come from the same brightness half of the fifteen. Two shapes that overlap one cell cannot keep separate colours in it.',
};

const AMIGA_OCS: Palette = {
  id: 'AMIGA_OCS',
  name: 'the Amiga (OCS)',
  label: 'Amiga (OCS) — 4,096 colours, 32 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 4 },
  onScreenColors: 32,
  colorsPerComponent: null,
  note: 'One 32-entry palette shared by everything on screen, since the artwork is blitted into the bitmap rather than drawn as hardware sprites.',
};

const ATARI_ST: Palette = {
  id: 'ATARI_ST',
  name: 'the Atari ST',
  label: 'Atari ST — 512 colours, 16 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
  onScreenColors: 16,
  colorsPerComponent: null,
  note: 'One 16-entry palette shared by everything on screen, since the artwork is blitted into the bitmap rather than drawn as hardware sprites.',
};

export const COMPUTER_PALETTES: Readonly<
  Record<Extract<PaletteId, 'COMMODORE_64' | 'ZX_SPECTRUM' | 'AMIGA_OCS' | 'ATARI_ST'>, Palette>
> = {
  COMMODORE_64,
  ZX_SPECTRUM,
  AMIGA_OCS,
  ATARI_ST,
};
