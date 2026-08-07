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
      tooltip:
        'What the prop fundamentally is. It decides the component breakdown as much as the look — a hinged chest, a turret and a wall panel share no parts at all — so set it before the structure base below.',
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
      tooltip:
        'Whether the object is working, damaged, sealed or overloading. It reads mostly as emissive state and damage — a powered-down console loses its glow entirely — which is what makes a paired on/off variant of one prop worth generating.',
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
      tooltip:
        'The design language the object is built in. It governs panel shapes, fastener style and material vocabulary across every component at once, which is what keeps a prop consistent with the world it is dropped into.',
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
      tooltip:
        'What the object does for the player. It drives the indicators that make that legible without a label — healing greens, hazard reds, objective markers — so the prop’s purpose reads before anyone interacts with it.',
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
      tooltip:
        'The space the object is installed in. Its surroundings show up on the housing as grime, frost or neon spill, and that is what makes a prop look like it belongs somewhere rather than like it was dropped in.',
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
      tooltip:
        'The physical geometry and volume — a pillar, a tabletop unit, a wall panel. It fixes how the object occupies space, and therefore its cell proportions in the atlas and whether it can sit on a floor tile at all.',
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
      tooltip:
        'The edge profile of the casing — chamfered, gothic, sleek pod. Hard-surface props live or die on this: interior detail vanishes at sprite scale, while a distinctive corner treatment is still readable.',
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
      tooltip:
        'The focal display — the part the eye goes to first. One bright interface reads better at sprite scale than several small ones, and it is usually the only component that needs an emissive colour at all.',
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
      tooltip:
        'How the object is broken into isolated components. SINGLE RIGID OBJECT emits one piece; the multi-segment and hinged plans split out the parts that actually move, so choose by what has to animate rather than by how complex the prop looks.',
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
      tooltip:
        'How the object is fixed in place — bolted, caged, suspended, freestanding. The mount is drawn as part of the prop, so it also decides where the prop can legally be placed once it is in a level.',
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
      tooltip:
        'Hazard stripes, stencils, engravings, exposed cabling and wear. These are what make an industrial prop believable, but each costs palette budget — a few well-placed marks read better than full coverage.',
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
      tooltip:
        'The structural casing colours — what a prop is recognised by in a busy scene. Two colours with a clear value gap keep the object separable from whatever it is standing against.',
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
      tooltip:
        'The status LEDs, wiring and screen light — the parts that read as emitting rather than reflecting. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
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
        'What the casing is made of, and how light reads off it: painted metal takes a soft sheen, polished brass a hard one, cut stone none at all. Under flat neutral lighting this is what still separates one surface from the next.',
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
        'Negative rules keeping operators, ground fixtures and scene dressing out of the sheet. Floor cables and pedestals are the usual offenders — each anchors the prop to a surface it may never actually be placed on.',
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
        'Extra moving parts — dishes, clamps, vents, barrels — isolated into their own sprite slots so they can animate against a static body. Leave this as NONE for a prop with no deployable state.',
      options: [
        'NONE',
        'Deployable Sensor Dish',
        'Articulated Arm Clamp',
        'Coolant Vent Flaps',
        'Deployable Turret Barrel',
        'Holographic Emitter Wings',
      ],
    },
  ],
};
