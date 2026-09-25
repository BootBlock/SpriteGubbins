import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  HEX_CODE_PINS_THE_HUE,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../guidanceSentences.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Effects and VFX — explosions, muzzle flashes, impacts, casts, portals, auras. The sheet that is a
 * *time sequence* rather than a part breakdown.
 *
 * Every other category decomposes its subject across space: a character into limbs, a vehicle into a
 * hull and a drive, a building into modules. An effect has no such seam — an explosion is not made of
 * an explosion-body and two explosion-arms — so filing one under OBJECT asks for a housing, a footing
 * and a hatch that no explosion has. What it decomposes into is *frames*: the same phenomenon at
 * successive moments of its own life, read left to right as an animation.
 *
 * That is why the sixteen keys read the way they do here. `anatomy` is the shape of the *sequence*
 * rather than of a body; `clothing` is the layer that trails the core rather than what is worn over
 * it; and `age` is how much energy the effect carries rather than how long it has existed. Two of
 * those are a stretch in any category — the keys are fixed and shared — and the labels below are
 * where the stretch is made honest.
 */
export const EFFECT: CategoryDefinition = {
  label: 'Effect / VFX Sequence',
  article: 'an',
  fields: [
    {
      key: 'species',
      label: 'Effect Type',
      tooltip:
        'What the effect _is_, which decides what every frame of the sequence is drawn as. A one-shot explosion, a muzzle flash and a looping portal are three different animations.\n\n' +
        SUBJECT_TYPE_ADDS_NO_COMPONENTS +
        ' Every type is drawn across the same number of frames.',
      options: [
        'Explosion / Detonation',
        'Muzzle Flash / Discharge',
        'Impact Hit Spark',
        'Slash / Weapon Trail',
        'Spell Cast / Channel',
        'Portal / Rift Opening',
        'Aura / Status Field',
        'Projectile Body & Trail',
        'Environmental Ambience',
        'Buff / Heal Burst',
        'Shield & Barrier Pulse',
        'Trail / Footfall Puff',
      ],
    },
    {
      key: 'gender',
      label: 'Element / Energy Class',
      tooltip:
        'What the effect is made of, described as energy rather than matter. It is the strongest single lever on colour, edge quality and how the light falls off: frost holds hard crystalline edges and a narrow hue range, while fire spreads soft across half the warm spectrum.\n\n' +
        'Stating it apart from the palette keeps the two from contradicting each other.',
      options: [
        'Fire & Ember',
        'Ice & Frost',
        'Arcane / Runic',
        'Plasma / Energy',
        'Void / Shadow',
        'Lightning / Electric',
        'Toxic / Corrosive',
        'Holy / Radiant',
        'Kinetic Dust & Debris',
        'Life & Nature',
        'Water & Wave',
        'Sound & Resonance',
        'Blood & Viscera',
      ],
    },
    {
      key: 'age',
      label: 'Intensity Tier',
      tooltip:
        'How much force this instance of the effect carries. A game often ships one effect at three strengths, and the tiers must be easy to tell apart while still reading as the same effect. That is a matter of scale, frame count and core brightness, not a redesign.',
      options: [
        'Minor / Glancing',
        'Standard Hit',
        'Heavy / Empowered',
        'Critical / Overcharged',
        'Ultimate / Screen-Filling',
        'Fizzle / Failed Cast',
        'Sustained Channel',
        'Fading Residue',
      ],
    },
    {
      key: 'role',
      label: 'Gameplay Role',
      tooltip:
        'What the effect is telling the player, which governs its timing more than its look. A telegraph must be legible _before_ anything happens and holds a readable shape for several frames; an impact confirmation lands in two and gets out of the way.',
      options: [
        'Telegraph / Wind-Up',
        'Impact Confirmation',
        'Persistent Area Field',
        'Pickup & Reward Flourish',
        'Death & Destruction',
        'Status Ailment Marker',
        'Traversal & Movement Cue',
        'Ambient Set Dressing',
        'Healing & Restoration',
        'Summon & Arrival',
        'Block & Parry Confirmation',
      ],
    },
    {
      key: 'setting',
      label: 'World & Genre',
      tooltip:
        'The fiction the whole effect library belongs to. It aligns the vocabulary across every effect at once: a grounded military game and a high-fantasy one disagree about whether a hit spark may carry runes at all.',
      options: [
        'High Fantasy Magic',
        'Deep-Space Sci-Fi',
        'Modern Military',
        'Cyberpunk Neon',
        'Cosmic Horror',
        'Retro Arcade',
        'Anime Action',
        'Grounded Naturalism',
        'Dark Fantasy Occult',
        'Cosy Storybook',
      ],
    },
    {
      key: 'build',
      label: 'Scale & Coverage',
      tooltip:
        'How much of the screen the effect covers at its widest frame. Stating it stops a hit spark and a cataclysm arriving at the same size, and it is the extent every frame must fit inside, since a peak frame that overruns its cell cannot be cut apart.',
      options: [
        'Point Spark',
        'Actor-Sized Burst',
        'Wide Area Blast',
        'Screen-Filling Cataclysm',
        'Thin Trail Or Ribbon',
        'Tall Column Or Beam',
        'Hand-Sized Flourish',
        'Ground-Hugging Spread',
      ],
    },
    {
      key: 'silhouette',
      label: 'Core Shape Language',
      tooltip:
        'The outline the effect grows along. At sprite scale it is the whole read, since a radial burst and a directed cone stay distinct at 32 px long after the ember detail is gone. It also shows the player where the force came from and where it is going.',
      options: [
        'Radial Burst',
        'Directed Cone',
        'Sweeping Ribbon Arc',
        'Vertical Column',
        'Expanding Ring / Shockwave',
        'Billowing Cloud Mass',
        'Jagged Shard Cluster',
        'Spiralling Vortex',
        'Rising Motes & Updraft',
        'Falling Rain Of Shards',
        'Braided Twin Strands',
        'Blooming Petal Unfold',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Core',
      tooltip:
        'The brightest point the eye lands on, and the anchor every frame is registered against. The core stays put while the rest expands, so it is the landmark a player tracks and the reference an animator aligns the cells by. Without one, an effect reads as a smear.',
      options: [
        'Hot White Centre',
        'Dense Molten Core',
        'Hollow Ring, No Centre',
        'Concentrated Point Flare',
        'Layered Multi-Core Cluster',
        'Diffuse, No Single Focus',
        'Rotating Sigil Disc',
        'Twin Paired Cores',
      ],
    },
    {
      key: 'anatomy',
      label: 'Frame Assembly Base',
      tooltip:
        'How the sequence divides in time, as the part split does in space for every other category. It tells the generator what the first and last frames must do: a loop’s final frame reads back into its first with no seam, where a one-shot simply ends.\n\n' +
        ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
      options: [
        'One-Shot Burst Sequence',
        'Seamless Loop Cycle',
        'Telegraph, Impact, Residue',
        'In, Hold, Out Transitions',
        'Staggered Multi-Burst',
        'Arrival, Settle, Idle',
        'Loop With Distinct Entry Frame',
      ],
    },
    {
      key: 'clothing',
      label: 'Secondary Layer',
      tooltip:
        'What trails the core and outlives it: smoke, debris, sparks. It is painted into the frames rather than drawn as a separate piece, and it fills the tail of the sequence, since the flash is over in three frames and its smoke is still clearing eight frames later.',
      options: [
        'Smoke & Soot Plume',
        'Flying Debris Chunks',
        'Trailing Spark Shower',
        'Ground Dust Kick-Up',
        'Drifting Ember Motes',
        'Condensation & Vapour',
        'No Secondary Layer',
        'Falling Petals & Leaves',
        'Rising Bubble Stream',
        'Splashing Droplets & Ripples',
      ],
      absentOption: 'No Secondary Layer',
    },
    {
      key: 'worn_details',
      label: 'Surface Motifs',
      tooltip:
        'The marks carried inside the effect’s own shape: glyphs, filaments, banding. Each costs palette budget and disappears first at small sizes, so a few bold motifs carry further than fine texture that turns to noise.',
      options: [
        'Runic Glyphs & Sigils',
        'Arcing Filaments',
        'Ember Speckle',
        'Crackle & Fracture Lines',
        'Concentric Pulse Rings',
        'Hard Cel Shape Banding',
        'Scrolling Noise Texture',
        'Soft Bokeh Motes',
        'Feathered Airbrush Falloff',
        'Scrolling Chevron Bands',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the effect’s body, by which it is identified against whatever it plays over. Two colours with a clear value gap keep it legible on both a dark cave floor and a bright snowfield, which a single mid-tone never manages.',
      options: [
        'Ember Orange #F97316 & Deep Red',
        'Frost Blue #38BDF8 & Pale White',
        'Arcane Violet #8B5CF6 & Indigo',
        'Plasma Cyan & Chrome',
        'Void Black & Crimson',
        'Toxic Acid Green & Charcoal',
        'Radiant Gold #FBBF24 & Cream',
        'Verdant Green #4ADE80 & Soft Gold',
        'Deep Ocean Blue & Foam White',
        'Bone Grey & Sickly Ochre',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The hottest and coolest extremes: the core flash, the spark tips, the scorch left behind. ' +
        HEX_CODE_PINS_THE_HUE,
      options: [
        'Core Flash White #FFFFFF',
        'Spark Yellow #FDE047',
        'Rim Magenta #F0ABFC',
        'Smoke Grey #6B7280',
        'Electric Cyan #22D3EE',
        'Scorch Umber #6B4423',
        'No Accent — Single Hue Ramp',
        'Petal Pink #FBCFE8',
        'Deep Shadow Indigo #312E81',
        'Warm Highlight Cream #FEF3C7',
      ],
    },
    {
      key: 'materials',
      label: 'Emission Medium',
      tooltip:
        'How the effect reads as light. Additive glow has no dark side and cannot be hidden behind anything, opaque shapes can be, and refraction shows what is behind it.\n\n' +
        'This decides whether the sheet works under the engine’s own blend mode at all: an additive effect painted with opaque black edges keys out as a hole.',
      options: [
        'Additive Glow, No Opaque Mass',
        'Opaque Painted Shapes',
        'Additive Core, Opaque Debris',
        'Refractive Distortion Only',
        'Hard-Edged Cel Shapes',
        'Soft Volumetric Haze',
        'Dithered Pixel Transparency',
        'Painted Shapes With Additive Rim',
        'Stippled Pixel Clusters',
        'Flat Silhouette Cut-Outs',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules that keep everything except the effect off the sheet. The source is the usual offender, since a generator asked for a muzzle flash draws the gun. Motion blur is another: it smears past a frame’s bounds and breaks the cell alignment an atlas depends on.',
      options: [
        'No character, hand or weapon in frame',
        'No ground plane or cast shadow',
        'No motion blur across the cell',
        'No damage numbers or UI text',
        'No lens flare or camera artefacts',
        'No overlap or bleed between frames',
        'No ground decal left behind',
        'No colour grading across the whole cell',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Additional Elements',
      tooltip:
        'Extra pieces beyond the sequence itself, such as a shockwave ring, a scorch decal or loose debris for a particle system, each isolated in its own sprite slot so the engine can time it on its own.\n\n' +
        'List them with commas and `×N` for how many of each: “Shockwave Ring ×1, Ember Cluster ×2” adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Shockwave Ring ×1, Ember Cluster ×2',
        'Ground Scorch Decal ×1',
        'Debris Chunk ×4',
        'Lingering Smoke Puff ×2',
        'Screen-Space Flash Frame ×1',
        'Healing Rune ×3',
        'Rising Petal ×4',
        'Splash Ring ×2',
        'Residual Glow Frame ×2',
      ],
    },
  ],
};
