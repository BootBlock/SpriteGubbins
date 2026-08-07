import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Structures and environment tiles — architecture rather than anatomy, sized in storeys.
 *
 * The source application left the last five fields without tooltips; they are written here in
 * the same voice, because a field with no tooltip renders no ⓘ at all and the specification
 * calls for guidance on every field.
 */
export const BUILDING: CategoryDefinition = {
  label: 'Building / Environment Tile',
  fields: [
    {
      key: 'species',
      label: 'Structure Type',
      tooltip:
        'What the structure is for. It fixes the massing and the entrance treatment before any styling is applied — a watchtower, a market kiosk and a shopfront are different buildings even in identical materials.',
      options: [
        'Modular Watchtower',
        'Ramen Stand Kiosk',
        'Blacksmith Forge',
        'Cybernetics Clinic',
        'Ancient Temple Gate',
        'Defense Bunker',
        'Sci-Fi Landing Pad',
        'Tavern Inn',
        'Alchemist Lab',
      ],
    },
    {
      key: 'gender',
      label: 'Occupancy / State',
      tooltip:
        'Whether the building is in use, abandoned, ruined or overgrown. State is what turns one structure into a set — the same shop lit and shuttered tells a player something without a word of text.',
      options: [
        'Active & In-Use',
        'Abandoned Ruins',
        'Fortified Stronghold',
        'Under Construction',
        'Severely Damaged',
        'Overgrown Nature takeover',
      ],
    },
    {
      key: 'age',
      label: 'Era & Architecture',
      tooltip:
        'The architectural language — proportion, window rhythm, roof pitch, ornament. It carries more of a building’s identity than its materials do, and it is what keeps a street of separate tiles looking like one place.',
      options: [
        'Neo-Tokyo Cyberpunk',
        'Medieval Timber-Frame',
        'Gothic Stone Fortress',
        'Sci-Fi Outpost Modular',
        'Ancient Egyptian Sandstone',
        'Steampunk Ironworks',
      ],
    },
    {
      key: 'role',
      label: 'Game Building Role',
      tooltip:
        'What the player comes here to do. It drives the readable affordances — a vendor counter, a turret mount, a crafting sign — so the building advertises its function from across the level.',
      options: [
        'Vendor / Shop Kiosk',
        'Defense Tower Structure',
        'Player Housing / Base',
        'Spawn Point',
        'Crafting Facility',
        'Resource Processing Plant',
      ],
    },
    {
      key: 'setting',
      label: 'Environment Biome',
      tooltip:
        'The surroundings the tile has to sit in. Biome shows up on the structure itself as snow load, sand scour or neon spill, which is what stops a building looking pasted onto its background.',
      options: [
        'Rain-Slicked Neon Street',
        'Snowy Mountain Pass',
        'Desert Wasteland',
        'Enchanted Forest Clearing',
        'Volcanic Cavern Base',
        'Deep Space Orbital',
      ],
    },
    {
      key: 'build',
      label: 'Building Scale',
      tooltip:
        'Footprint and storey count. This decides how a tile relates in size to the character sprites beside it, so it is worth setting against the resolution profile rather than in isolation.',
      options: [
        '2-Story Compact Footprint',
        '1-Story Wide Kiosk',
        'Tall 3-Tier Tower',
        'Fortified Gatehouse',
        'Sprawling Low Structure',
        'Miniature Outpost Pod',
      ],
    },
    {
      key: 'silhouette',
      label: 'Roof & Framework',
      tooltip:
        'The roofline — the part of a building visible from furthest away. Pitched tiles, solar glass and battlements each give a distinct top edge, and that edge is usually the only feature that survives at map zoom.',
      options: [
        'Pitched Tiled Roof & Lanterns',
        'Overhanging Neon Signage & Pipes',
        'Battlements & Machicolations',
        'Dome Array',
        'Spiked Roof Gables',
        'Solar Glass Panels',
      ],
    },
    {
      key: 'face_head',
      label: 'Entrance & Facade',
      tooltip:
        'The front entry, and how the facade frames it. On a game building the entrance is the interaction point, so it needs to read as enterable at a glance rather than as another piece of decoration.',
      options: [
        'Open Counter & Bar Stools',
        'Heavy Reinforced Oak Door',
        'Sliding Automated Glass',
        'Runic Archway',
        'Steel Blast Door',
        'Curtained Archway',
      ],
    },
    {
      key: 'anatomy',
      label: 'Building Assembly Base',
      tooltip:
        'How the structure is split into modular tiles or components. Choose by how it will be placed — a repeating wall module tiles horizontally, a single-piece kiosk does not — because the split has to match the level grid.',
      options: [
        'MODULAR BUILDING TILES',
        'SINGLE STRUCTURE MODEL',
        'TOWER WITH DETACHABLE ROOF',
        'WALL SECTION WITH GATE',
        'CORNER TILE PIECE',
      ],
    },
    {
      key: 'clothing',
      label: 'Awning & Addons',
      tooltip:
        'Awnings, scaffolding, solar panels and other attachments to the shell. They break up a flat facade cheaply, and are the easiest way to make repeated tiles of one building look like separate premises.',
      options: [
        'Striped Fabric Awning',
        'Solar Panel Array',
        'Gargoyle Corner Statues',
        'Wooden Scaffolding',
        'Neon Holographic Banner',
        'Ivy Trellis Grill',
      ],
    },
    {
      key: 'worn_details',
      label: 'Facade Details',
      tooltip:
        'Lanterns, signage, vents, cabling and ivy — the layer that gives a building lived-in specificity. Small emissive details here double as night-time lighting cues, so they earn their palette budget twice.',
      options: [
        'Hanging Paper Lanterns & Cables',
        'Wall Mounted Torches & Shield',
        'Holographic Vending Sign',
        'Moss & Ivy Growth',
        'Exposed Air Conditioning Units',
        'Bullet Scratches',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant wall, roof and structural colours that set the building against its biome. Roof and wall want a clear value gap between them, since the roof is the plane a player sees first from above.',
      options: [
        'Dark Stained Wood & Vermilion Red #EA580C',
        'Weathered Grey Stone & Oak',
        'Concrete Slate & Blue Metal',
        'Sandstone & Copper',
        'Gothic Slate & Bronze',
        'White Polymer & Glass',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The signage, lantern and window-light colours that make a structure read as occupied. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Warm Lantern Orange #F97316',
        'Neon Pink Sign Glow #F43F5E',
        'Torchfire Yellow #EAB308',
        'Verdigris Green #10B981',
        'Plasma Cyan Stream #06B6D4',
        'Golden Runic Glow #F59E0B',
      ],
    },
    {
      key: 'materials',
      label: 'Construction Materials',
      tooltip:
        'What the structure is built from, and how those surfaces read at sprite scale. Brick, timber and concrete stop being individual units once a tile is small and become texture instead, so choose for the pattern each one leaves behind.',
      options: [
        'Cedar Wood, Clay Tiles & Paper',
        'Cut Granite Blocks & Iron Girders',
        'Corrugated Iron & Glass',
        'Marble & Gold',
        'Reinforced Concrete & Steel',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping terrain, scenery and inhabitants out of an isolated structure tile. Ground, foliage and cast shadows matter most: each fuses the building to a background the level is going to replace.',
      options: [
        'No ground terrain tiles, no characters',
        'No surrounding trees or sky',
        'No vehicles',
        'No floor shadow, no grid overlay',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Structural Appendages',
      tooltip:
        'Extra attached structures — chimneys, antennae, annexes — each isolated into its own sprite slot so it can be varied per placement. Comma-separated, with ×N for how many of each: “Chimney ×2, Antenna Rig ×1” adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'External Chimney ×1, Smoke Pipe ×1',
        'Rooftop Antenna Rig ×1',
        'Side Storage Shed Module ×1',
        'Defensive Turret Mount ×1',
        'Rooftop Heli-Pad ×1',
      ],
    },
  ],
};
