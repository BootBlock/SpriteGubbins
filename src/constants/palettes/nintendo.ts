import type { Palette, PaletteId } from '../../types/palette.ts';

/**
 * Nintendo's colour, from two bits to fifteen.
 *
 * **Where the hex values come from.** The DMG four are the set the whole retro-art world means by
 * "Game Boy green"; the greyscale four are derived rather than transcribed, being the linear
 * normalisation of the same two-bit signal onto grey. The 55 NES entries are Lospec's published
 * palette for the machine — the PPU emits an analogue composite signal rather than RGB, so every RGB
 * table for it is one rendering of that signal among several, and taking a published one keeps this
 * file from being a private opinion about NTSC decoding.
 *
 * **None of those three machines holds an RGB colour**, which is why all three carry an
 * `approximates` phrase and the prompt repeats it. The DMG stores a two-bit shade index per pixel and
 * nothing more: what a player saw was that index driven through a reflective green LCD lit by
 * whatever was in the room, so the four hexes below are the appearance and not the data. They are
 * kept because they are the convention every art tool, emulator and generator already means by "Game
 * Boy green" — the value of a shared reference is the whole point of naming one — but a *measured*
 * set would be equally defensible and no more authoritative, which is the reason the claim is worded
 * down rather than the numbers swapped for someone else's.
 *
 * The Game Boy Color and the SNES have no list at all: both are 15-bit RGB, so their palette is a
 * colour space, and their entry states the ladder instead. **That is the distinction the DMG and the
 * Game Boy Color are most often collapsed into one of** — four greens is the DMG, and describing the
 * colour machine that succeeded it in those terms would be wrong twice over: wrong about the count,
 * and wrong about there being a list to count.
 */

const GAME_BOY_DMG: Palette = {
  id: 'GAME_BOY_DMG',
  name: 'the original Game Boy (DMG)',
  label: 'Game Boy (DMG) — 4 shades of green',
  space: {
    kind: 'FIXED',
    entries: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
    approximates:
      'the four shade levels a DMG stores, seen through its reflective green LCD — whose colour shifts with the ambient light, the viewing angle, the unit and its age, so no one set of four is the authoritative reading',
  },
  onScreenColors: 4,
  colorsPerComponent: 3,
  note: 'Two bits per pixel, so four shades exist and no others. An object takes three of them from one of two object palettes, its fourth entry being transparent.',
};

const GAME_BOY_MONO: Palette = {
  id: 'GAME_BOY_MONO',
  name: 'a monochrome Game Boy screen',
  label: 'Game Boy (monochrome) — 4 greys',
  // The same two-bit signal as the DMG, normalised onto grey rather than onto the green LCD: 0, 85,
  // 170 and 255 are `round(i × 255 / 3)`. This is the Pocket and Light read, and the one every
  // emulator offers as "greyscale".
  space: {
    kind: 'FIXED',
    entries: ['#000000', '#555555', '#AAAAAA', '#FFFFFF'],
    approximates:
      'the four shade levels a Game Boy stores, read as neutral grey rather than through the DMG’s green LCD — which is how a Pocket or a Light shows them',
  },
  onScreenColors: 4,
  colorsPerComponent: 3,
  note: 'Two bits per pixel, so four greys exist and no others. An object takes three of them, its fourth entry being transparent.',
};

const GAME_BOY_COLOR: Palette = {
  id: 'GAME_BOY_COLOR',
  name: 'the Game Boy Color',
  label: 'Game Boy Color — 32,768 colours, 56 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 5 },
  onScreenColors: 56,
  colorsPerComponent: 3,
  note: 'Eight background palettes and eight object palettes of four entries each; an object spends three of its four on colour and the fourth on transparency.',
};

const NES: Palette = {
  id: 'NES',
  name: 'the Nintendo Entertainment System',
  label: 'NES — 55 colours, 25 at once',
  space: {
    kind: 'FIXED',
    approximates:
      'the composite signal the PPU emits, which carries a hue and a luminance rather than a colour — several published tables decode it differently',
    entries: [
      '#000000',
      '#FCFCFC',
      '#F8F8F8',
      '#BCBCBC',
      '#7C7C7C',
      '#A4E4FC',
      '#3CBCFC',
      '#0078F8',
      '#0000FC',
      '#B8B8F8',
      '#6888FC',
      '#0058F8',
      '#0000BC',
      '#D8B8F8',
      '#9878F8',
      '#6844FC',
      '#4428BC',
      '#F8B8F8',
      '#F878F8',
      '#D800CC',
      '#940084',
      '#F8A4C0',
      '#F85898',
      '#E40058',
      '#A80020',
      '#F0D0B0',
      '#F87858',
      '#F83800',
      '#A81000',
      '#FCE0A8',
      '#FCA044',
      '#E45C10',
      '#881400',
      '#F8D878',
      '#F8B800',
      '#AC7C00',
      '#503000',
      '#D8F878',
      '#B8F818',
      '#00B800',
      '#007800',
      '#B8F8B8',
      '#58D854',
      '#00A800',
      '#006800',
      '#B8F8D8',
      '#58F898',
      '#00A844',
      '#005800',
      '#00FCFC',
      '#00E8D8',
      '#008888',
      '#004058',
      '#F8D8F8',
      '#787878',
    ],
  },
  onScreenColors: 25,
  colorsPerComponent: 3,
  note: 'Four sprite palettes of three colours plus transparency, and four background palettes of three over one shared backdrop; a background palette covers a whole 16 × 16 pixel area.',
};

const SNES: Palette = {
  id: 'SNES',
  name: 'the Super Nintendo',
  label: 'Super Nintendo — 32,768 colours, 256 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 5 },
  onScreenColors: 256,
  colorsPerComponent: 15,
  note: 'Eight object palettes of fifteen colours plus transparency, and eight more for backgrounds.',
};

export const NINTENDO_PALETTES: Readonly<
  Record<Extract<PaletteId, 'GAME_BOY_DMG' | 'GAME_BOY_MONO' | 'GAME_BOY_COLOR' | 'NES' | 'SNES'>, Palette>
> = {
  GAME_BOY_DMG,
  GAME_BOY_MONO,
  GAME_BOY_COLOR,
  NES,
  SNES,
};
