import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * The PC graphics standards, and the one fantasy console.
 *
 * The shared conventions behind `settings` are stated in ./nintendo.ts. All three PC modes are
 * 320 × 200 on a 4:3 display, which makes their pixels noticeably taller than they are wide — the
 * single most-forgotten fact about DOS-era art, and the reason a faithful sprite drawn on square
 * pixels looks stretched.
 *
 * PICO-8 is filed here rather than with a hardware family because it has none: it is a software
 * console whose constraints are chosen rather than imposed, and it is the one entry in this library
 * whose figures really are drawn at the size of its own sprite.
 */

const CGA: HardwareProfile = {
  id: 'CGA',
  name: 'IBM CGA',
  label: 'IBM CGA — 320 × 200, tall pixels',
  constraints: [
    'The display is 320 × 200 on a 4:3 screen, so every pixel is noticeably taller than it is wide.',
    'There are no hardware sprites: every figure is drawn into the bitmap.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    // Four colours in total, one of them the background: an outline would take a quarter of the
    // palette, and CGA art separates its forms by value instead.
    outlineStyle: 'OUTLINE_LESS_ALBEDO',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'CGA_MODE_4',
  },
};

const EGA: HardwareProfile = {
  id: 'EGA',
  name: 'IBM EGA',
  label: 'IBM EGA — 320 × 200, tall pixels',
  constraints: [
    'The display is 320 × 200 on a 4:3 screen, so every pixel is noticeably taller than it is wide.',
    'There are no hardware sprites: every figure is drawn into the bitmap.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 32 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'EGA_16',
  },
};

const VGA_256: HardwareProfile = {
  id: 'VGA_256',
  name: 'VGA in its 256-colour mode',
  label: 'IBM VGA (mode 13h) — 320 × 200',
  constraints: [
    'The display is 320 × 200 on a 4:3 screen, so every pixel is noticeably taller than it is wide.',
    'There are no hardware sprites: every figure is drawn into the bitmap, at any size.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'DETAILED_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '48 × 64 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'VGA_256',
  },
};

const PICO_8: HardwareProfile = {
  id: 'PICO_8',
  name: 'PICO-8',
  label: 'PICO-8 — 128 × 128, 8 × 8 sprites',
  constraints: [
    'The display is 128 × 128 pixels with square pixels.',
    'A sprite is 8 × 8 pixels; larger objects are drawn as blocks of adjacent sprites.',
    'The sprite sheet itself is 128 × 128, holding 256 sprites and no more.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '8 × 8 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    palette: 'PICO_8',
  },
};

export const PC_HARDWARE: Readonly<
  Record<Extract<HardwareProfileId, 'CGA' | 'EGA' | 'VGA_256' | 'PICO_8'>, HardwareProfile>
> = {
  CGA,
  EGA,
  VGA_256,
  PICO_8,
};
