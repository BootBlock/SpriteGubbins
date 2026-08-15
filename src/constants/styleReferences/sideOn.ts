import type { StyleReference, StyleReferenceId } from '../../types/styleReference.ts';

/**
 * The six references drawn in flat side elevation — the platformer and side-scroller convention.
 *
 * All six take `ORTHOGRAPHIC_SIDE` and a zero camera elevation, so what distinguishes them is
 * everything else: the grid, the frame the art was authored for, and how each constrains colour.
 *
 * **None of them says how many ways the figure turns.** Every one of these games covers a single
 * side, but that is the direction set's to state, and a characteristic saying so would be restating a
 * control the reader can change. Where it is worth knowing — Cave Story draws both sides out rather
 * than flipping one, which is unusual — it is on the preset card, which is not prompt text. That
 * asymmetry looks like an oversight and is the opposite — see `StyleReference.characteristics`.
 */

const SONIC_THE_HEDGEHOG: StyleReference = {
  id: 'SONIC_THE_HEDGEHOG',
  name: 'Sonic the Hedgehog',
  label: 'Sonic the Hedgehog — Mega Drive, 320 × 224',
  characteristics: [
    'Levels are assembled in three tiers — 8 × 8 hardware tiles grouped into 16 × 16 blocks, and those into 256 × 256 chunks.',
    'A figure is assembled on screen from several hardware sprites at once, because one sprite reaches only 32 × 32 pixels.',
    'Pure black is spent on a few interior separations rather than on the boundary, so the body is bounded in dark blue instead.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '32 × 40 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    // Flat rather than a fixed key. The sprites do carry baked shading, but it is measured as coming
    // from the character's own upper right and the engine mirrors the figure — so the highlight
    // follows the body rather than the world, which none of the app's three lighting models states.
    // A flat sheet is the honest answer and the one an engine can light for itself.
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    hardwareProfile: 'MEGA_DRIVE',
    palette: 'MEGA_DRIVE',
    paletteLimit: null,
  },
};

const SHOVEL_KNIGHT: StyleReference = {
  id: 'SHOVEL_KNIGHT',
  name: 'Shovel Knight',
  label: 'Shovel Knight — 400 × 240, NES rules bent',
  characteristics: [
    'The virtual frame is 400 × 240 pixels — the same rendered height as an NES but deliberately wider, for a 16:9 presentation.',
    'Background tiles are 16 × 16 pixels, as most artwork for that machine was.',
    'No sprite carries more than five colours plus transparency, where the machine being imitated allowed three plus transparency.',
    'Four colours outside that machine’s 54-colour hardware palette are used — a dark purple, a deep red, a beige and a light brown — for gradients and for skin tones the original palette could not reach.',
  ],
  settings: {
    renderStyle: 'RETRO_PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'MID_RESOLUTION',
    spriteTargetSize: '',
    outlineStyle: 'PURE_BLACK_OUTLINE',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    // No profile and no pinned palette: this look is an eight-bit machine's rules deliberately
    // broken, so naming the machine would contract for limits the artwork does not keep.
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'STRICT_32_COLOR',
  },
};

const CAVE_STORY: StyleReference = {
  id: 'CAVE_STORY',
  name: 'Cave Story',
  label: 'Cave Story — 320 × 240, 16 px tiles',
  characteristics: [
    'The artwork is authored at 320 × 240 with square pixels; the doubled look on screen is the engine scaling it as it loads, not the size it was drawn at.',
    'Everything sits on a 16 × 16 pixel tile grid.',
    'Black may not appear as a visible colour anywhere in the artwork. The original engine keyed transparency on it, so anything drawn in black was punched out of the sprite, and every dark accent is a very dark shade of its own area instead.',
    'Transparency is all or nothing — a pixel is drawn or it is not — so no edge is softened or partly see-through.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'MINIMAL',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '16 × 16 px',
    // Not a black outline, which is the trap this look sets: black is the key colour, so a contour
    // drawn in it is punched out of the sprite. The darkest shade of each local colour is what the
    // artwork actually uses.
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'STRICT_32_COLOR',
  },
};

const CELESTE: StyleReference = {
  id: 'CELESTE',
  name: 'Celeste',
  label: 'Celeste — 320 × 180, 8 px tiles',
  characteristics: [
    'The whole game renders at a fixed 320 × 180 pixels whatever the window size, and is scaled up by whole numbers so the pixels stay square.',
    'Everything sits on an 8 × 8 pixel tile grid.',
    'The player character’s hair is simulated and recoloured by the engine over a hairless sprite, so it is not drawn into the artwork at all.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'MID_RESOLUTION',
    spriteTargetSize: '',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    // Every light in the game is a runtime shader pass over the sprites, so the artwork underneath
    // is flat by construction.
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'RESTRAINED_64_COLOR',
  },
};

const TERRARIA: StyleReference = {
  id: 'TERRARIA',
  name: 'Terraria',
  label: 'Terraria — 16 px tiles on an 18 px pitch',
  characteristics: [
    'Tiles are 16 × 16 pixels packed on an 18 × 18 pitch — two pixels of padding sit to the right of and below every tile.',
    'Every pixel is drawn as a 2 × 2 block on an even boundary, so the effective resolution is half what the artwork measures and nothing may be detailed at single-pixel size.',
    'Pure black appears nowhere in the artwork at all, however dark an area gets.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'CUSTOM',
    spriteTargetSize: '40 × 56 px',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    // The engine lights every sprite from torches and daylight as it draws, so the artwork is
    // authored unlit for that pass to work on.
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'RESTRAINED_64_COLOR',
  },
};

const BLASPHEMOUS: StyleReference = {
  id: 'BLASPHEMOUS',
  name: 'Blasphemous',
  label: 'Blasphemous — 640 × 360, large figures',
  characteristics: [
    'The artwork is authored at 640 × 360 and displayed at whole-number multiples of that, so every pixel lands square on the grid and no edge is softened or partly see-through.',
    'The figures are drawn far larger than the machines this style descends from could hold — roughly a fifth of the frame height for a standing figure — and the detail is spent on that scale rather than on effects.',
    'Colour is organised as short ramps per material rather than one set shared across the figure: four or five steps for a piece of armour, eight for leather, four for a blade.',
    'A bright material carries its own boundary: a blade edge separates by being lighter than what is behind it, rather than by gaining a dark line of its own.',
  ],
  settings: {
    renderStyle: 'PIXEL_ART',
    surfaceDetail: 'DETAILED_PRODUCTION',
    // No figure size: the studio has published none, and what circulates is measurement of extracted
    // frames rather than a stated figure. The scale is described in the characteristics instead,
    // where it can be given as the proportion it actually is.
    resolutionProfile: 'MID_RESOLUTION',
    spriteTargetSize: '',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    projection: 'ORTHOGRAPHIC_SIDE',
    cameraElevation: 0,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'RESTRAINED_64_COLOR',
  },
};

export const SIDE_ON_STYLE_REFERENCES: Readonly<
  Record<
    Extract<
      StyleReferenceId,
      'SONIC_THE_HEDGEHOG' | 'SHOVEL_KNIGHT' | 'CAVE_STORY' | 'CELESTE' | 'TERRARIA' | 'BLASPHEMOUS'
    >,
    StyleReference
  >
> = {
  SONIC_THE_HEDGEHOG,
  SHOVEL_KNIGHT,
  CAVE_STORY,
  CELESTE,
  TERRARIA,
  BLASPHEMOUS,
};
