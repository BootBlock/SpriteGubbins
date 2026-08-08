import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * The home computers. The shared conventions behind `settings` are stated in ./nintendo.ts.
 *
 * The two eight-bit machines here are the ones whose *shape* is as constrained as their colour, and
 * both constraints belong in `constraints` rather than in the palette: the C64's multicolour pixel
 * is twice as wide as it is tall, which changes every diagonal on the sheet, and the Spectrum's
 * artwork has no hardware sprites at all, so a figure is drawn into the same bitmap as everything
 * behind it.
 *
 * The Amiga and the ST are given at the resolution games used rather than at their productivity
 * modes, and the Amiga at PAL height, which is what its art was composed for.
 */

const COMMODORE_64: HardwareProfile = {
  id: 'COMMODORE_64',
  name: 'the Commodore 64',
  label: 'Commodore 64 — 160 × 200 multicolour',
  constraints: [
    'The multicolour display is 160 × 200, and every pixel is twice as wide as it is tall — so a 45° diagonal climbs two pixels for one across, and a circle is drawn as an ellipse.',
    'Character graphics sit on an 8 × 8 pixel cell grid.',
    'A hardware sprite is 24 × 21 pixels, or 12 × 21 doubled-width pixels in multicolour, and 8 of them exist at once.',
    'Sprites may be stretched to twice their width or height, never scaled smoothly.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    // The hardware sprite itself, in multicolour pixels — the one machine here where the object and
    // the conventional figure are the same thing.
    spriteTargetSize: '12 × 21 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'COMMODORE_64',
  },
};

const ZX_SPECTRUM: HardwareProfile = {
  id: 'ZX_SPECTRUM',
  name: 'the ZX Spectrum',
  label: 'ZX Spectrum — 256 × 192',
  constraints: [
    'The display is 256 × 192 pixels with square pixels.',
    'There are no hardware sprites: every figure is drawn into the same bitmap as the background.',
    // The attribute cell is what actually shapes Spectrum art, and it is stated in the palette's
    // note — it is a rule about colour, and this list is the machine's geometry.
    'A figure is built to align its internal boundaries to the 8 × 8 pixel cell grid the display is divided into.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    // Two colours per cell, one of which is the paper: an outline in a third colour cannot exist, so
    // the form separates by value and by the shape of the cell boundary alone.
    outlineStyle: 'OUTLINE_LESS_ALBEDO',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'ZX_SPECTRUM',
  },
};

const AMIGA_OCS: HardwareProfile = {
  id: 'AMIGA_OCS',
  name: 'the Amiga (OCS)',
  label: 'Commodore Amiga (OCS) — 320 × 256',
  constraints: [
    // Square, not tall. A PAL low-resolution 320 × 256 fills the raster, which is what makes its
    // pixels square; the *NTSC* Amiga's 320 × 200 is the tall one, and pairing that pixel shape with
    // the PAL resolution — in the sentence that says PAL was chosen deliberately — was the error.
    'The display is 320 × 256 pixels in the PAL mode games were composed for, with square pixels.',
    'Artwork is blitted into the bitmap rather than drawn as hardware sprites, so a figure may be any size.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 48 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'AMIGA_OCS',
  },
};

const ATARI_ST: HardwareProfile = {
  id: 'ATARI_ST',
  name: 'the Atari ST',
  label: 'Atari ST — 320 × 200 low resolution',
  constraints: [
    'The display is 320 × 200 pixels in the low-resolution mode games used, with tall pixels.',
    'There are no hardware sprites: every figure is blitted into the bitmap, so it may be any size.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 32 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'ATARI_ST',
  },
};

export const COMPUTER_HARDWARE: Readonly<
  Record<
    Extract<HardwareProfileId, 'COMMODORE_64' | 'ZX_SPECTRUM' | 'AMIGA_OCS' | 'ATARI_ST'>,
    HardwareProfile
  >
> = {
  COMMODORE_64,
  ZX_SPECTRUM,
  AMIGA_OCS,
  ATARI_ST,
};
