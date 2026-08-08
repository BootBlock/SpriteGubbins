import type { Palette, PaletteId } from '../../types/palette.ts';

/**
 * The two sprite machines that had no budget problem, and the fantasy console that has nothing else.
 *
 * The PC Engine and the Neo Geo sit at the two ends of what a colour space bought you: the same
 * fifteen-plus-transparency sprite as everything else in the sixteen-bit era, with 482 and 4,096
 * of them on screen respectively. That is why their art looks the way it does — the constraint that
 * shaped it was never the palette.
 *
 * **PICO-8's sixteen are the whole machine**, and are Lospec's published set — which is also the
 * authoritative one, since the console is software and its palette is a literal in its source.
 */

const PC_ENGINE: Palette = {
  id: 'PC_ENGINE',
  name: 'the PC Engine / TurboGrafx-16',
  label: 'PC Engine — 512 colours, 482 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
  onScreenColors: 482,
  colorsPerComponent: 15,
  note: 'Sixteen sprite palettes of fifteen colours plus transparency, and sixteen more for backgrounds — so a sheet can afford a palette per character rather than per screen.',
};

const NEO_GEO: Palette = {
  id: 'NEO_GEO',
  name: 'the Neo Geo',
  label: 'Neo Geo — 4,096 on screen, 15 per sprite',
  // Fifteen bits of colour with a sixteenth "dark" bit shared across the whole entry, which halves
  // it rather than adding a channel level — so the space every colour is chosen from is the same
  // five-bit ladder as the SNES, and the dark bit is an effect applied to it.
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 5 },
  onScreenColors: 4096,
  colorsPerComponent: 15,
  note: '256 palettes of fifteen colours plus transparency, so a single character can carry several of them across its parts.',
};

const PICO_8: Palette = {
  id: 'PICO_8',
  name: 'PICO-8',
  label: 'PICO-8 — 16 fixed colours',
  space: {
    kind: 'FIXED',
    entries: [
      '#000000',
      '#1D2B53',
      '#7E2553',
      '#008751',
      '#AB5236',
      '#5F574F',
      '#C2C3C7',
      '#FFF1E8',
      '#FF004D',
      '#FFA300',
      '#FFEC27',
      '#00E436',
      '#29ADFF',
      '#83769C',
      '#FF77A8',
      '#FFCCAA',
    ],
  },
  onScreenColors: 16,
  // Sixteen for the whole console, and a sprite may use every one of them, so there is no second
  // limit to state.
  colorsPerComponent: null,
  note: 'Sixteen colours for the entire console, one of which a sprite nominates as transparent. There is no second palette and no way to add one.',
};

export const ARCADE_PALETTES: Readonly<
  Record<Extract<PaletteId, 'PC_ENGINE' | 'NEO_GEO' | 'PICO_8'>, Palette>
> = {
  PC_ENGINE,
  NEO_GEO,
  PICO_8,
};
