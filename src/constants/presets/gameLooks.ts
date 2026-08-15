import type { PresetArchetype } from '../../types/preset.ts';
import { gameLookOutput } from './gameLookPreset.ts';
import { sparseSubject } from './sparseSubject.ts';

/**
 * One preset per shipped art style reference — the deliverable each look is most often wanted for.
 *
 * **These are technical presets, like the Unsung Saviour family and unlike everything else in the
 * library.** A worked example says what to draw; these say how it has to be drawn, and leave who the
 * subject is almost entirely to the reader. That is the whole point of pairing them with a
 * reference: the reference fixes the look and this fixes the *deliverable* — the sheet mode, the
 * facings, whether the pieces articulate — which is the half a reference deliberately does not
 * decide.
 *
 * **The facings are the interesting half, and they are the sheet's rather than the game's.** Four of
 * these games shipped three drawn facings and mirrored a fourth, and the sheet contract forbids a
 * mirrored view outright — so those presets ask for all four to be drawn, which is a deliberate
 * departure and is what their cards say. Where a game's own scheme *is* what the sheet should ask
 * for, it is: the five-view set is what Age of Empires II drew before flipping three, the
 * eight-compass run is what Diablo II rendered with nothing mirrored, and a side-on platformer covers
 * the single facing its engine flips.
 *
 * **A card names the game; the compiled prompt does not, unless the reader asks it to.** The
 * `nameStyleReference` switch is off in every one of these, as it is in the studio's defaults —
 * see `ImageOutputConfig`, which says why the look does not depend on it.
 */
export const GAME_LOOK_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'look-stardew-valley',
    name: 'Stardew Valley — Overworld figure',
    description:
      'The farming-sim read: a 16 × 32 figure on a 16 px tile grid, drawn face-on over ground seen from above. The game mirrored one side; this draws all four, because the sheet may not repeat a view.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground tile beneath the figure, no baked shadow, no perspective on the body',
    }),
    output: gameLookOutput('STARDEW_VALLEY', {
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FOUR_CARDINAL',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-a-link-to-the-past',
    name: 'A Link to the Past — Overworld figure',
    description:
      'The 16-bit overhead adventure: a hardware palette, a 16 px map grid and a 16 × 24 figure drawn face-on. The original mirrored one side; this draws all four, since a sheet may not repeat a view.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground tile beneath the figure, no baked shadow, no perspective on the body',
    }),
    output: gameLookOutput('A_LINK_TO_THE_PAST', {
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FOUR_CARDINAL',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-links-awakening',
    name: 'Link’s Awakening — Handheld figure',
    description:
      'The tightest contract the library ships: four shades of the original handheld’s green screen, a 16 px grid and a 16 × 16 figure. Form has to come from silhouette, because there is no room to shade.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground tile beneath the figure, no baked shadow, no dithered shading',
    }),
    output: gameLookOutput('LINKS_AWAKENING', {
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FOUR_CARDINAL',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-pokemon-emerald',
    name: 'Pokémon Emerald — Overworld figure',
    description:
      'The handheld overworld read: a 16 × 32 figure on an 8 px hardware grid, drawn face-on with a sixteen-colour palette of its own. Four cardinal facings on a 240 × 160 screen.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground tile beneath the figure, no baked shadow, no perspective on the body',
    }),
    output: gameLookOutput('POKEMON_EMERALD', {
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FOUR_CARDINAL',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-sonic-the-hedgehog',
    name: 'Sonic the Hedgehog — Side-on figure',
    description:
      'The 16-bit side-scroller: a 32 × 40 figure bounded in the darkest shade of its own colour rather than black, on a console palette. One facing, because the hardware flips it for the other.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground beneath the figure, no baked shadow, no motion blur',
    }),
    output: gameLookOutput('SONIC_THE_HEDGEHOG', {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'ULTRAWIDE_21_9',
    }),
  },
  {
    id: 'look-shovel-knight',
    name: 'Shovel Knight — Side-on figure',
    description:
      'Eight-bit rules kept where they help and broken where they do not: five colours per sprite against the machine’s three, a 16 px tile grid, and a frame wider than the hardware ever was.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground beneath the figure, no baked shadow, no gradients, no anti-aliasing',
    }),
    output: gameLookOutput('SHOVEL_KNIGHT', {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'ULTRAWIDE_21_9',
    }),
  },
  {
    id: 'look-cave-story',
    name: 'Cave Story — Side-on figure',
    description:
      'The plainest contract here: a 320 × 240 screen, a 16 px grid and flat fills, nothing tinted or lit as it is drawn, and black unusable as a colour because the engine keys transparency on it.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground beneath the figure, no baked shadow, no gradients',
    }),
    output: gameLookOutput('CAVE_STORY', {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'ULTRAWIDE_21_9',
    }),
  },
  {
    id: 'look-terraria',
    name: 'Terraria — Side-on figure',
    description:
      'The sandbox platformer read: a 40 × 56 figure drawn unlit, because the engine lights every sprite from torches and daylight as it draws it. One facing, flipped for the other.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground beneath the figure, no baked shadow, no baked highlight',
    }),
    output: gameLookOutput('TERRARIA', {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'ULTRAWIDE_21_9',
    }),
  },
  {
    id: 'look-blasphemous',
    name: 'Blasphemous — Side-on figure',
    description:
      'Large, densely detailed pixel figures on a 640 × 360 frame, shaded by hand rather than lit by an engine, with colour laid out as short ramps per material. One facing, flipped for the other.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground beneath the figure, no baked shadow, no anti-aliased edges',
    }),
    output: gameLookOutput('BLASPHEMOUS', {
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'ULTRAWIDE_21_9',
    }),
  },
  {
    id: 'look-celeste-tileset',
    name: 'Celeste — Platform tileset',
    description:
      'An 8 px tile field for a 320 × 180 screen, drawn flat because every light in that game is a pass the engine makes over the art afterwards. Tiles have one view, so nothing turns.',
    category: 'BUILDING',
    subject: sparseSubject('BUILDING', {
      anatomy: 'Modular Building Tiles',
      materials:
        'Seamless tiling: opposite edges match so tiles butt without a visible join, and no tile carries a feature that reveals repetition when laid in a field',
      exclusions: 'No characters, no props, no baked lighting, no shadow',
    }),
    output: gameLookOutput('CELESTE', {
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      rigMode: 'NONE',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-diablo-ii',
    name: 'Diablo II — Eight-facing creature rig',
    description:
      'A 2:1 diamond ground and a creature rendered at all eight facings with nothing mirrored, in separable pieces — which is how that game built a figure, and one sheet per facing here.',
    category: 'CREATURE',
    subject: sparseSubject('CREATURE', {
      exclusions: 'No ground tile beneath the figure, no baked contact shadow, no assembled figure',
    }),
    output: gameLookOutput('DIABLO_II', {
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      rigMode: 'CUTOUT_RIG',
      aspectRatio: 'SQUARE_1_1',
    }),
  },
  {
    id: 'look-age-of-empires-ii',
    name: 'Age of Empires II — Five-facing unit',
    description:
      'The five views that game actually drew, on a 2:1 diamond ground — it flipped three of them for the other side rather than drawing eight, so five is the faithful set to ask for.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions: 'No ground tile beneath the figure, no baked contact shadow, no anti-aliased edges',
    }),
    output: gameLookOutput('AGE_OF_EMPIRES_II', {
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // The classic vocabulary on a projected ground, deliberately. Its five yaws — 0, 45, 90, 135
      // and 180 — are exactly the five this game drew before flipping three of them, and no compass
      // set has five members. The words describe the subject's own turn rather than a compass, which
      // is what a unit does here whatever the ground beneath it is doing.
      directions: 'FIVE_CLASSIC',
      rigMode: 'POSE_LIBRARY',
      aspectRatio: 'WIDE_16_9',
    }),
  },
];
