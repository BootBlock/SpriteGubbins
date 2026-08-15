import type { StyleReference, StyleReferenceId } from '../../types/styleReference.ts';

/**
 * The four references whose ground plane is read from above.
 *
 * **All four share the convention this app most needs stated**, and it is the one an unqualified
 * "top-down" gets wrong: the ground recedes as though seen from above while the figures standing on
 * it are drawn as flat front elevations. A generator told "top-down" draws the tops of heads, which
 * is not what any of these games looks like — so each says so in its own characteristics, and each
 * takes `ORTHOGRAPHIC_FRONT` as its projection because the figure is what the sheet draws.
 *
 * **What is fact and what is a choice**, exactly as the hardware library divides them: every line in
 * `characteristics` is a measurement or a documented decision, and `settings` is the opinionated half
 * — what artwork for this look conventionally is, not what it must be. Where a source could not be
 * found, nothing is written: a character size nobody has published is absent rather than estimated,
 * which is why three of these four state no figure size at all.
 */

const STARDEW_VALLEY: StyleReference = {
  id: 'STARDEW_VALLEY',
  name: 'Stardew Valley',
  label: 'Stardew Valley — 16 px tiles, 16 × 32 figure',
  characteristics: [
    'The world sits on a 16 × 16 pixel tile grid.',
    'The ground plane reads as though seen from above, while the figures standing on it are drawn as flat front elevations — a character shows their face and the front of their body, never the top of their head. Nothing recedes at an angle.',
    'Three facings are drawn — towards the camera, away from it, and one side — and the fourth is that side flipped.',
    'A figure stands two tiles tall on a one-tile grid, and that difference in height is what carries the read.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 32 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    // The engine draws a darkness and lamp-light layer over the art for night and interiors, so the
    // sprite has to be unlit for that pass to have anything to do.
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_FRONT',
    cameraElevation: 0,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'RESTRAINED_64_COLOR',
  },
};

const A_LINK_TO_THE_PAST: StyleReference = {
  id: 'A_LINK_TO_THE_PAST',
  name: 'The Legend of Zelda: A Link to the Past',
  label: 'Zelda: A Link to the Past — SNES, 256 × 224',
  characteristics: [
    'The display is 256 × 224 pixels, and the map is authored to a 16 × 16 pixel grid built from four 8 × 8 hardware tiles.',
    'The pixels are not square: on the 4:3 screen this art was drawn for, each is displayed a little wider than it is tall.',
    'The figure is composed on screen from two overlapping hardware sprites, and the sword, shield and shadow are further pieces laid over it rather than parts of the same drawing.',
    'The ground plane reads as though seen from above, while characters are drawn as flat front elevations — the walking figure shows its face and chest rather than the top of its head.',
    'Four cardinal facings are covered, with one side view mirrored to serve the other rather than drawn twice.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    // 16 × 24, which is the drawn envelope rather than either figure usually quoted: the player is
    // two 16 × 16 hardware sprites overlapping by eight rows, so 16 × 16 is one of the pair and
    // 16 × 32 assumes they stack without overlapping.
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 24 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_FRONT',
    cameraElevation: 0,
    hardwareProfile: 'SNES',
    palette: 'SNES',
    paletteLimit: null,
  },
};

const LINKS_AWAKENING: StyleReference = {
  id: 'LINKS_AWAKENING',
  name: 'The Legend of Zelda: Link’s Awakening',
  label: 'Zelda: Link’s Awakening — Game Boy, 4 shades',
  characteristics: [
    'The display is 160 × 144 pixels with square pixels, and map objects sit on a 16 × 16 pixel grid built from four 8 × 8 hardware tiles.',
    'The ground plane reads as though seen from above, while characters are drawn as flat front elevations.',
    'Four cardinal facings are covered, with one side view mirrored to serve the other rather than drawn twice.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 16 px',
    // Four shades in all, so a black contour would spend a quarter of the palette on the boundary.
    // The darkest shade doing double duty is what the machine's art actually does.
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_FRONT',
    cameraElevation: 0,
    hardwareProfile: 'GAME_BOY',
    // The green of the original reflective screen rather than a neutral grey — the two are different
    // looks, and this reference is for the machine the game shipped on.
    palette: 'GAME_BOY_DMG',
    paletteLimit: null,
  },
};

const POKEMON_EMERALD: StyleReference = {
  id: 'POKEMON_EMERALD',
  name: 'Pokémon Emerald',
  label: 'Pokémon Emerald — GBA, 240 × 160',
  characteristics: [
    'The display is 240 × 160 pixels with square pixels, and everything sits on an 8 × 8 pixel hardware tile grid.',
    'Each sprite draws from a sixteen-colour palette of its own, one of sixteen the hardware holds at once.',
    'The ground plane reads as though seen from above, while characters are drawn as flat front elevations.',
    'Four cardinal facings are covered, with one side view mirrored to serve the other rather than drawn twice.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 32 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_FRONT',
    cameraElevation: 0,
    // The app ships no handheld profile for this machine, so the display and the tile grid are stated
    // in the characteristics above instead of being carried by a profile.
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'STRICT_32_COLOR',
  },
};

export const OVERHEAD_STYLE_REFERENCES: Readonly<
  Record<
    Extract<
      StyleReferenceId,
      'STARDEW_VALLEY' | 'A_LINK_TO_THE_PAST' | 'LINKS_AWAKENING' | 'POKEMON_EMERALD'
    >,
    StyleReference
  >
> = {
  STARDEW_VALLEY,
  A_LINK_TO_THE_PAST,
  LINKS_AWAKENING,
  POKEMON_EMERALD,
};
