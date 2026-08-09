import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
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
  fields: [
    {
      key: 'species',
      label: 'Effect Type',
      tooltip:
        'What the effect *is*, which decides the shape of its sequence before any styling does. A one-shot explosion, a three-frame muzzle flash and a looping portal are three different animations, and the number of frames each needs is a property of this choice rather than of the art style over it.',
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
      ],
    },
    {
      key: 'gender',
      label: 'Element / Energy Class',
      tooltip:
        'What the effect is made of, said as energy rather than as matter. It is the strongest single lever on colour, edge quality and how the light falls off — frost holds hard crystalline edges and a narrow hue range, fire spreads soft and spans half the warm spectrum — so stating it separately from the palette keeps the two from contradicting each other.',
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
      ],
    },
    {
      key: 'age',
      label: 'Intensity Tier',
      tooltip:
        'How much force this instance of the effect carries. A game usually ships one effect at three strengths, and the tiers have to be tellable apart at a glance while still reading as the same effect — which is a decision about scale, frame count and core brightness, not about redesigning the thing.',
      options: [
        'Minor / Glancing',
        'Standard Hit',
        'Heavy / Empowered',
        'Critical / Overcharged',
        'Ultimate / Screen-Filling',
        'Fizzle / Failed Cast',
      ],
    },
    {
      key: 'role',
      label: 'Gameplay Role',
      tooltip:
        'What the effect is telling the player, which governs its timing more than its look does. A telegraph has to be legible *before* anything happens and holds a readable shape for several frames; an impact confirmation has to land in two and get out of the way of the thing it just hit.',
      options: [
        'Telegraph / Wind-Up',
        'Impact Confirmation',
        'Persistent Area Field',
        'Pickup & Reward Flourish',
        'Death & Destruction',
        'Status Ailment Marker',
        'Traversal & Movement Cue',
        'Ambient Set Dressing',
      ],
    },
    {
      key: 'setting',
      label: 'World & Genre',
      tooltip:
        'The fiction the whole effect library belongs to. It aligns the vocabulary across every effect at once — a grounded military game and a high-fantasy one disagree about whether a hit spark may carry runes at all, and mixing the two reads as two games sharing a screen.',
      options: [
        'High Fantasy Magic',
        'Deep-Space Sci-Fi',
        'Modern Military',
        'Cyberpunk Neon',
        'Cosmic Horror',
        'Retro Arcade',
        'Anime Action',
        'Grounded Naturalism',
      ],
    },
    {
      key: 'build',
      label: 'Scale & Coverage',
      tooltip:
        'How much of the screen the effect occupies at its widest frame. Stating it explicitly is what stops a hit spark and a cataclysm arriving the same size — and it is the extent every frame has to fit inside, since a sheet whose peak frame overruns its cell cannot be cut apart.',
      options: [
        'Point Spark',
        'Actor-Sized Burst',
        'Wide Area Blast',
        'Screen-Filling Cataclysm',
        'Thin Trail Or Ribbon',
        'Tall Column Or Beam',
      ],
    },
    {
      key: 'silhouette',
      label: 'Core Shape Language',
      tooltip:
        'The outline the effect grows along. At sprite scale it is the whole read — a radial burst and a directed cone are still distinguishable at 32 px long after the ember detail is gone — and it is also what tells the player where the force came from and where it is going.',
      options: [
        'Radial Burst',
        'Directed Cone',
        'Sweeping Ribbon Arc',
        'Vertical Column',
        'Expanding Ring / Shockwave',
        'Billowing Cloud Mass',
        'Jagged Shard Cluster',
        'Spiralling Vortex',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Core',
      tooltip:
        'The brightest point the eye lands on, and the anchor every frame is registered against. An effect without one reads as a smear: the core is what stays put while the rest expands, so it is the landmark a player tracks and the reference an animator aligns the cells by.',
      options: [
        'Hot White Centre',
        'Dense Molten Core',
        'Hollow Ring, No Centre',
        'Concentrated Point Flare',
        'Layered Multi-Core Cluster',
        'Diffuse, No Single Focus',
      ],
    },
    {
      key: 'anatomy',
      label: 'Frame Assembly Base',
      tooltip:
        'How the sequence divides in time — the equivalent of the part split every other category makes in space. It decides what the first and last frames have to do: a loop’s final frame must read back into its first with no seam, where a one-shot’s simply ends.',
      options: [
        'One-Shot Burst Sequence',
        'Seamless Loop Cycle',
        'Telegraph, Impact, Residue',
        'In, Hold, Out Transitions',
        'Core And Secondary Split',
        'Staggered Multi-Burst',
      ],
    },
    {
      key: 'clothing',
      label: 'Secondary Layer',
      tooltip:
        'What trails the core and outlives it — smoke, debris, sparks. Painted into the frames rather than drawn as a separate piece, and it is what carries the tail of the sequence: the flash is over in three frames and the smoke it left is still clearing eight later, so this is what those last frames have in them.',
      options: [
        'Smoke & Soot Plume',
        'Flying Debris Chunks',
        'Trailing Spark Shower',
        'Ground Dust Kick-Up',
        'Drifting Ember Motes',
        'Condensation & Vapour',
        'No Secondary Layer',
      ],
    },
    {
      key: 'worn_details',
      label: 'Surface Motifs',
      tooltip:
        'The marks carried inside the effect’s own shape — glyphs, filaments, banding. Each costs palette budget and disappears first at small sizes, so a few bold motifs that survive downscaling carry further than fine texture that turns to noise.',
      options: [
        'Runic Glyphs & Sigils',
        'Arcing Filaments',
        'Ember Speckle',
        'Crackle & Fracture Lines',
        'Concentric Pulse Rings',
        'Hard Cel Shape Banding',
        'Scrolling Noise Texture',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the effect’s body — what it is identified by against whatever it plays over. Two colours with a clear value gap are what keep it legible on both a dark cave floor and a bright snowfield, which a single mid-tone never manages.',
      options: [
        'Ember Orange #F97316 & Deep Red',
        'Frost Blue #38BDF8 & Pale White',
        'Arcane Violet #8B5CF6 & Indigo',
        'Plasma Cyan & Chrome',
        'Void Black & Crimson',
        'Toxic Acid Green & Charcoal',
        'Radiant Gold #FBBF24 & Cream',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The hottest and coolest extremes — the core flash, the spark tips, the scorch left behind. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Core Flash White #FFFFFF',
        'Spark Yellow #FDE047',
        'Rim Magenta #F0ABFC',
        'Smoke Grey #6B7280',
        'Electric Cyan #22D3EE',
        'Scorch Umber #6B4423',
        'No Accent — Single Hue Ramp',
      ],
    },
    {
      key: 'materials',
      label: 'Emission Medium',
      tooltip:
        'How the effect reads as light: additive glow has no dark side and cannot be occluded, opaque shapes can be, and refraction shows what is behind it. It decides whether the sheet is usable under the engine’s own blend mode at all — an additive effect painted with opaque black edges keys out as a hole.',
      options: [
        'Additive Glow, No Opaque Mass',
        'Opaque Painted Shapes',
        'Additive Core, Opaque Debris',
        'Refractive Distortion Only',
        'Hard-Edged Cel Shapes',
        'Soft Volumetric Haze',
        'Dithered Pixel Transparency',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping everything except the effect off the sheet. The source is the usual offender — asked for a muzzle flash, a generator draws the gun — and so is motion blur, which smears past a frame’s own bounds and destroys the cell alignment an atlas depends on.',
      options: [
        'No character, hand or weapon in frame',
        'No ground plane or cast shadow',
        'No motion blur across the cell',
        'No damage numbers or UI text',
        'No lens flare or camera artefacts',
        'No overlap or bleed between frames',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Additional Elements',
      tooltip:
        'Extra pieces beyond the sequence itself — a shockwave ring, a scorch decal, loose debris a particle system scatters — each isolated into its own sprite slot so the engine can time it independently. Comma-separated, with ×N for how many of each: “Shockwave Ring ×1, Ember Cluster ×2” adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Shockwave Ring ×1, Ember Cluster ×2',
        'Ground Scorch Decal ×1',
        'Debris Chunk ×4',
        'Lingering Smoke Puff ×2',
        'Screen-Space Flash Frame ×1',
      ],
    },
  ],
};
