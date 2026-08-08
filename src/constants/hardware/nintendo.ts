import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * Nintendo's four machines, from the 1989 handheld to the 1990 console.
 *
 * **What is fact and what is a choice.** Every line in `constraints` is a hardware figure — the
 * display, the tile grid, the object sizes, how many objects the machine could show and how many it
 * could show on one scanline. `settings` is the opinionated half, and it is a *preset* in exactly
 * the sense the archetype library is: it says what artwork for this machine conventionally looks
 * like, not what it must be.
 *
 * Two of those choices are worth stating once for the whole hardware library, since they repeat:
 *
 * - **`ISOMETRIC_TOP_LEFT` lighting**, which the app describes as a fixed 45° key with hard shadow
 *   bands. That is the defining shading convention of the era on every machine here that had colours
 *   to spare for it — sprites were shaded as though lit from the upper left, in two or three hard
 *   steps, because a gradient was not available. The machines with too few colours to shade at all
 *   take `FLAT_NEUTRAL_ALBEDO` instead.
 * - **`spriteTargetSize` is the typical size of one drawn character**, not a hardware maximum. A
 *   Game Boy object is 8 × 16, and a Game Boy character is two of them side by side; stating the
 *   object size would ask for half a figure. Where the machine's own sprite *is* the conventional
 *   figure size — the C64's 24 × 21, PICO-8's 8 × 8 — the two coincide, and those are noted where
 *   they occur.
 */

const GAME_BOY: HardwareProfile = {
  id: 'GAME_BOY',
  name: 'the original Game Boy (DMG)',
  label: 'Nintendo Game Boy (DMG) — 160 × 144',
  constraints: [
    'The display is 160 × 144 pixels with square pixels.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Objects are 8 × 8 or 8 × 16 pixels, and a character is built from several placed side by side.',
    '40 objects exist at once and only 10 may cross any one scanline.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 16 px',
    // Four shades total, so a black outline would spend a quarter of the palette on the contour and
    // leave two shades for the whole form. The darkest shade doing double duty is what Game Boy art
    // actually does.
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'GAME_BOY_DMG',
  },
};

const GAME_BOY_COLOR: HardwareProfile = {
  id: 'GAME_BOY_COLOR',
  name: 'the Game Boy Color',
  label: 'Nintendo Game Boy Color — 160 × 144',
  constraints: [
    'The display is 160 × 144 pixels with square pixels.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Objects are 8 × 8 or 8 × 16 pixels, and a character is built from several placed side by side.',
    '40 objects exist at once and only 10 may cross any one scanline.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 16 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'GAME_BOY_COLOR',
  },
};

const NES: HardwareProfile = {
  id: 'NES',
  name: 'the Nintendo Entertainment System',
  label: 'Nintendo NES / Famicom — 256 × 240',
  constraints: [
    'The display is 256 × 240 pixels, drawn on a television whose pixels are slightly wider than they are tall.',
    // The 16 × 16 attribute area is the NES's other famous grid, and it belongs to the palette's
    // note rather than here: it is where a *background palette* changes, which is a colour fact.
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Sprites are 8 × 8 or 8 × 16 pixels, and a character is built from several placed side by side.',
    '64 sprites exist at once and only 8 may cross any one scanline, which is why figures are narrow.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    // Three colours per sprite, and the era's answer was to spend one of them on a black contour so
    // the figure separated from whatever background it crossed.
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'NES',
  },
};

const SNES: HardwareProfile = {
  id: 'SNES',
  name: 'the Super Nintendo',
  label: 'Nintendo Super NES — 256 × 224',
  constraints: [
    'The display is 256 × 224 pixels, drawn on a television whose pixels are slightly wider than they are tall.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Sprites are 8, 16, 32 or 64 pixels on a side, so a whole character can be one object.',
    '128 sprites exist at once and up to 32 may cross any one scanline.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 32 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'SNES',
  },
};

export const NINTENDO_HARDWARE: Readonly<
  Record<Extract<HardwareProfileId, 'GAME_BOY' | 'GAME_BOY_COLOR' | 'NES' | 'SNES'>, HardwareProfile>
> = {
  GAME_BOY,
  GAME_BOY_COLOR,
  NES,
  SNES,
};
