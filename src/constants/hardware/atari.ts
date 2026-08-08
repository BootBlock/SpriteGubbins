import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * The Atari 2600, which constrains a sprite sheet more than anything else in this library.
 *
 * Its own file for the reason its palette is: nothing else here has a pixel four times wider than it
 * is tall, and the paragraph explaining why belongs beside the numbers.
 *
 * **The 160 across is not a resolution the machine stores.** The TIA has no frame buffer at all —
 * the program writes registers while the beam is travelling — and 160 is how many colour clocks fit
 * across the visible line. A player object is eight of those clocks, which is what makes a 2600
 * figure eight pixels wide however tall it is.
 *
 * **Two different pixels, and they must not be confused.** A sprite pixel is one colour clock, which
 * on an NTSC set works out at roughly 12:7 — about 1.7 times as wide as it is tall. The *playfield*
 * pixel is four colour clocks, 40 across the same line, so its blocks are four times wider again;
 * that 4× is the ratio between the two pixels, not the aspect of either. Reporting it as the sprite
 * pixel's aspect would ask for a figure distorted well over twice as hard as the machine's.
 */

const ATARI_2600: HardwareProfile = {
  id: 'ATARI_2600',
  name: 'the Atari 2600',
  label: 'Atari 2600 — 160 × 192, very wide pixels',
  constraints: [
    'The visible field is 160 × 192, and every pixel is roughly 1.7 times as wide as it is tall — so a figure reads as horizontal bands, and a diagonal is a coarse staircase.',
    'A player object is 8 pixels wide, of any height, and may be stretched to twice or four times that width but never scaled smoothly.',
    'There are two player objects, two single-pixel missiles and one ball, and nothing else may be drawn as an object.',
    'The background is a symmetrical playfield of blocks four times that width — 40 across the same line — and is not artwork.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    // The player object's own width, at a height a whole figure was drawn to.
    spriteTargetSize: '8 × 16 px',
    // One colour per object per scanline: there is nothing left over for a contour, and nothing to
    // shade with either.
    outlineStyle: 'OUTLINE_LESS_ALBEDO',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'ATARI_2600_NTSC',
  },
};

export const ATARI_HARDWARE: Readonly<Record<Extract<HardwareProfileId, 'ATARI_2600'>, HardwareProfile>> = {
  ATARI_2600,
};
