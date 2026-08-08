import type { Palette, PaletteId } from '../../types/palette.ts';

/**
 * The three PC graphics standards a sprite artist would recognise.
 *
 * These are the one family here whose colours are **digital** rather than an analogue signal
 * somebody measured: CGA and EGA drive four TTL lines, so the sixteen RGBI colours are exactly what
 * the standard says they are, brown's dimmed green included — it is the one entry that is not simply
 * the intensity bit applied to the colour below it.
 *
 * `CGA_MODE_4` is the four-colour mode rather than the sixteen, because that is what CGA *artwork*
 * means: 320 × 200 with a fixed four-entry palette, of which the cyan/magenta/white one is the look
 * the era is remembered for.
 */

const CGA_MODE_4: Palette = {
  id: 'CGA_MODE_4',
  name: 'IBM CGA in its four-colour mode',
  label: 'CGA (mode 4) — black, cyan, magenta, white',
  space: { kind: 'FIXED', entries: ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF'] },
  onScreenColors: 4,
  // The whole screen has four, and nothing is drawn as a hardware sprite, so a per-component figure
  // would restate the line above rather than add to it.
  colorsPerComponent: null,
  note: 'Four colours for the entire display, so form comes from shape and from dithering two of them together rather than from shading.',
};

const EGA_16: Palette = {
  id: 'EGA_16',
  name: 'IBM EGA',
  label: 'EGA — the 16 RGBI colours',
  space: {
    kind: 'FIXED',
    entries: [
      '#000000',
      '#0000AA',
      '#00AA00',
      '#00AAAA',
      '#AA0000',
      '#AA00AA',
      '#AA5500',
      '#AAAAAA',
      '#555555',
      '#5555FF',
      '#55FF55',
      '#55FFFF',
      '#FF5555',
      '#FF55FF',
      '#FFFF55',
      '#FFFFFF',
    ],
  },
  onScreenColors: 16,
  colorsPerComponent: null,
  // "a larger 64" rather than "a wider 64": the guard in `palettes.test.ts` reads *wider* as a claim
  // about the display, which is not what a note may make — and beside a colour count the word was
  // ambiguous in the prompt too, which is the better reason to have changed it.
  note: 'Sixteen colours for the entire display, chosen from a larger set of 64 but almost always left at this default set. Each hue has one dark and one bright form and nothing between them, so mid-tones are dithered.',
};

const VGA_256: Palette = {
  id: 'VGA_256',
  name: 'VGA in its 256-colour mode',
  label: 'VGA (mode 13h) — 256 of 262,144',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 6 },
  onScreenColors: 256,
  colorsPerComponent: null,
  note: 'One 256-entry palette for the whole display, each entry chosen freely from six bits per channel — enough for smooth ramps, which is what separates this era’s art from the sixteen-colour one before it.',
};

export const PC_PALETTES: Readonly<Record<Extract<PaletteId, 'CGA_MODE_4' | 'EGA_16' | 'VGA_256'>, Palette>> =
  {
    CGA_MODE_4,
    EGA_16,
    VGA_256,
  };
