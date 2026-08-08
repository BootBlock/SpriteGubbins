import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';

/**
 * The two machines whose sprite hardware was never the thing holding the art back.
 *
 * The shared conventions behind `settings` are stated in ./nintendo.ts. Both take
 * `DETAILED_PRODUCTION` surface detail, which nothing else in the library does: on a Neo Geo a
 * character is a few hundred pixels tall with fifteen colours per part and several parts, so the
 * seams and material divisions that would be noise on a Game Boy are what that art is made of.
 */

const PC_ENGINE: HardwareProfile = {
  id: 'PC_ENGINE',
  name: 'the PC Engine / TurboGrafx-16',
  label: 'NEC PC Engine / TurboGrafx-16 — 256 × 239',
  constraints: [
    'The display is 256 × 239 pixels, drawn on a television whose pixels are slightly wider than they are tall.',
    'Backgrounds sit on an 8 × 8 pixel tile grid.',
    'Sprites are 16 or 32 pixels wide and 16, 32 or 64 tall, so a character is one object or a few.',
    '64 sprites exist at once.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 32 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'PC_ENGINE',
  },
};

const NEO_GEO: HardwareProfile = {
  id: 'NEO_GEO',
  name: 'the Neo Geo',
  label: 'SNK Neo Geo — 320 × 224',
  constraints: [
    'The display is 320 × 224 pixels, drawn on a television whose pixels are slightly narrower than they are tall.',
    'A sprite is a 16-pixel-wide column of 16 × 16 tiles, up to 512 pixels tall; a character is several columns side by side.',
    '381 sprites exist at once, so a figure may be assembled from a great many of them.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'DETAILED_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '64 × 96 px',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    palette: 'NEO_GEO',
  },
};

export const ARCADE_HARDWARE: Readonly<
  Record<Extract<HardwareProfileId, 'PC_ENGINE' | 'NEO_GEO'>, HardwareProfile>
> = {
  PC_ENGINE,
  NEO_GEO,
};
