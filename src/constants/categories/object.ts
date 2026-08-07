import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Interactive props — terminals, chests, turrets. Hard-surface geometry rather than anatomy.
 *
 * The source application left the last three fields without tooltips; they are written here in
 * the same voice, because a field with no tooltip renders no ⓘ at all and the specification
 * calls for guidance on every field.
 */
export const OBJECT: CategoryDefinition = {
  label: 'Interactive Object / Prop',
  fields: [
    {
      key: 'species',
      label: 'Object Category',
      tooltip: 'Defines functional object classification (terminal, loot chest, turret).',
      options: [
        'Interactive Terminal',
        'Loot Chest / Container',
        'Power Generator',
        'Defense Turret',
        'Portal Gate',
        'Healing Station',
        'Vending Machine',
        'Control Console',
        'Ancient Relic Shrine',
      ],
    },
    {
      key: 'gender',
      label: 'Operational Status',
      tooltip: 'Defines active state, power level, or destruction level.',
      options: [
        'Fully Functional',
        'Damaged / Repaired',
        'Ancient Sealed',
        'Overclocked / Active',
        'Power Offline',
        'Corrupted Glitching',
        'Self-Destruct Sequence',
      ],
    },
    {
      key: 'age',
      label: 'Tech Era',
      tooltip: 'Establishes mechanical design language and era aesthetic.',
      options: [
        'Futuristic Sci-Fi',
        'Ancient Magitech',
        'Retro 80s Industrial',
        'Medieval Wood & Iron',
        'Steampunk Brass',
        'Alien Crystal Tech',
        'Post-Apocalyptic Scraps',
      ],
    },
    {
      key: 'role',
      label: 'Game Function',
      tooltip: 'Guides visual indicators (healing green lights, explosive red danger decals).',
      options: [
        'Save Station / Healer',
        'High-Tier Loot Source',
        'Hazard Obstacle',
        'Objective Device',
        'Resource Converter',
        'Security Gateway',
        'Ammunition Recharger',
      ],
    },
    {
      key: 'setting',
      label: 'Environment Context',
      tooltip: 'Sets surrounding biome aesthetics reflected on object housing.',
      options: [
        'Command Bridge',
        'Dungeon Chamber',
        'Cyber City Alley',
        'Abandoned Lab',
        'Temple Vault',
        'Space Station Engine Room',
        'Industrial Factory',
      ],
    },
    {
      key: 'build',
      label: 'Form Factor',
      tooltip: 'Defines physical geometry volume (pillar, tabletop, wall panel).',
      options: [
        'Heavy Heavy Pillar',
        'Compact Tabletop Device',
        'Modular Wall Panel',
        'Spherical Pod',
        'Cylindrical Conduit',
        'Pyramidal Structure',
        'Wall-Mounted Box',
      ],
    },
    {
      key: 'silhouette',
      label: 'Hard Surfaces',
      tooltip: 'Specifies hard-surface edge profile (chamfered, gothic arch, sleek pod).',
      options: [
        'Chamfered Rectangular Box',
        'Pyramidal Conduit',
        'Cylindrical Core',
        'Asymmetric Mechanical',
        'Ornate Gothic Arches',
        'Sleek Oval Pod',
        'Hexagonal Tower',
      ],
    },
    {
      key: 'face_head',
      label: 'Interface Screen',
      tooltip: 'Defines main focal display (hologram, dials, rune core, keypads).',
      options: [
        'Holographic Display Screen',
        'Analog Dials & Gauge Panels',
        'Runic Crystal Core',
        'Keypad & Biometric Scanner',
        'Glowing Monitor Array',
        'Lever & Valve Array',
      ],
    },
    {
      key: 'anatomy',
      label: 'Structure Base',
      tooltip: 'Controls how mechanical parts are broken down into isolated components.',
      options: [
        'SINGLE RIGID OBJECT',
        'MULTI-SEGMENT TURRET',
        'HINGED CHEST CONTAINER',
        'MODULAR CONDUIT',
        'ROTATING SPHERICAL CORE',
      ],
    },
    {
      key: 'clothing',
      label: 'Mounting / Framework',
      tooltip: 'Defines base floor mounts, cages, or mounting brackets.',
      options: [
        'Floor Bolted Frame',
        'Reinforced Steel Cage',
        'Suspended Cable Rig',
        'Freestanding Base',
        'Wall-Anchored Brackets',
        'Hydraulic Lift Feet',
      ],
    },
    {
      key: 'worn_details',
      label: 'Utility Markings',
      tooltip: 'Adds warning stencils, hazard stripes, or exposed cabling details.',
      options: [
        'Hazard Stripes & Decals',
        'Warning Stencils & LEDs',
        'Runic Engravings',
        'Coolant Pipe Joints',
        'Exposed Circuit Wiring',
        'Graffiti & Scratches',
        'Moss & Vines',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip: 'Main structural casing colors.',
      options: [
        'Industrial Yellow #EAB308 & Charcoal',
        'Matte White & Dark Slate',
        'Weathered Bronze & Teak',
        'Deep Cobalt Blue #1E3A8A',
        'Gunmetal Grey & Orange',
        'Rusted Iron & Olive',
        'Gilded Gold #F59E0B & Marble',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip: 'Emissive status LED and wiring accent colors.',
      options: [
        'Alert Orange LEDs #F97316',
        'Laser Green Glow #10B981',
        'Stasis Blue Core #3B82F6',
        'Crimson Warning Strip #EF4444',
        'Neon Cyan Cables #06B6D4',
        'Arcane Purple Gem #8B5CF6',
        'Hot Pink Glitch #F43F5E',
      ],
    },
    {
      key: 'materials',
      label: 'Material Plating',
      tooltip:
        'Defines the casing surface and how light reads off it (painted metal vs polished brass vs cut stone).',
      options: [
        'Painted Sheet Metal & Acrylic',
        'Polished Brass & Oak',
        'Carbon Composite & Glass',
        'Cast Iron',
        'Carved Granite & Crystal',
        'Reflective Mirror Alloy',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Strict negative rules preventing operators, ground fixtures, or scene dressing from appearing beside the prop.',
      options: [
        'No living character, no shadows',
        'No cables on floor',
        'No text or letters',
        'No pedestal or ground grid',
        'No ambient smoke',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Deployable Modules',
      tooltip:
        'Extra moving parts — dishes, clamps, vents — isolated into their own sprite slots for animation. Comma-separated, with ×N for how many of each — "Vent Flap ×2, Clamp ×1" adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Deployable Sensor Dish ×1',
        'Articulated Arm Clamp ×1',
        'Coolant Vent Flap ×2',
        'Deployable Turret Barrel ×1',
        'Holographic Emitter Wing ×2',
      ],
    },
  ],
};
