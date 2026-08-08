import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * Sega's three machines. The shared conventions behind `settings` are stated in ./nintendo.ts.
 *
 * The Mega Drive's 320-pixel mode is the one given, because it is the one games shipped in and the
 * one its art was drawn for; the narrower 256-pixel mode existed and was mostly used for Master
 * System compatibility.
 */

const MASTER_SYSTEM: HardwareProfile = {
  id: 'MASTER_SYSTEM',
  name: 'the Sega Master System',
  label: 'Sega Master System — 256 × 192',
  constraints: [
    'The display is 256 × 192 pixels, drawn on a television whose pixels are slightly wider than they are tall.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Sprites are 8 × 8 or 8 × 16 pixels, and a character is built from several placed side by side.',
    '64 sprites exist at once and only 8 may cross any one scanline, which is why figures are narrow.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'MASTER_SYSTEM',
  },
};

const MEGA_DRIVE: HardwareProfile = {
  id: 'MEGA_DRIVE',
  name: 'the Sega Mega Drive',
  label: 'Sega Mega Drive / Genesis — 320 × 224',
  constraints: [
    'The display is 320 × 224 pixels, drawn on a television whose pixels are slightly narrower than they are tall.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Sprites are 8 to 32 pixels on a side, so a character is one object or a few large ones.',
    '80 sprites exist at once and up to 20 may cross any one scanline.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 48 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'MEGA_DRIVE',
  },
};

const GAME_GEAR: HardwareProfile = {
  id: 'GAME_GEAR',
  name: 'the Sega Game Gear',
  label: 'Sega Game Gear — 160 × 144',
  constraints: [
    'The display is 160 × 144 pixels with square pixels.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'Sprites are 8 × 8 or 8 × 16 pixels, and a character is built from several placed side by side.',
    '64 sprites exist at once and only 8 may cross any one scanline.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'GAME_GEAR',
  },
};

export const SEGA_HARDWARE: Readonly<
  Record<Extract<HardwareProfileId, 'MASTER_SYSTEM' | 'MEGA_DRIVE' | 'GAME_GEAR'>, HardwareProfile>
> = {
  MASTER_SYSTEM,
  MEGA_DRIVE,
  GAME_GEAR,
};
