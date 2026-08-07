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
      tooltip: 'Defines architectural structure type (watchtower, kiosk, shop).',
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
      tooltip: 'Specifies structure condition (active, ruined, overgrown).',
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
      tooltip: 'Establishes architecture style (Gothic stone, Neo-Tokyo, timber).',
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
      tooltip: 'Guides vendor counters, turret mounts, or crafting signs.',
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
      tooltip: 'Sets surrounding biome details (snowy, desert, neon street).',
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
      tooltip: 'Defines building dimensions and story count footprint.',
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
      tooltip: 'Focuses roofline silhouette (pitched tiles, solar glass, battlements).',
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
      tooltip: 'Defines front entry (open counter, heavy oak door, blast door).',
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
      tooltip: 'Controls building tile modular breakdown.',
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
      tooltip: 'Adds fabric awnings, scaffolding, or solar panels.',
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
      tooltip: 'Specifies lanterns, signs, air conditioners, or ivy growth.',
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
      tooltip: 'Dominant wall, roof and structural colors that set the building against its biome.',
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
      tooltip: 'Emissive signage, lantern and window-light colors that make the structure read as occupied.',
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
      tooltip: 'Defines what the structure is built from and how those surfaces read at sprite scale.',
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
        'Strict negative rules keeping terrain, scenery and inhabitants out of an isolated structure tile.',
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
        'Requests extra attached structures — chimneys, antennae, annexes — isolated into their own sprite slots.',
      options: [
        'NONE',
        'External Chimney & Smoke Pipe',
        'Rooftop Antenna Rig',
        'Side Storage Shed Module',
        'Defensive Turret Mount',
        'Rooftop Heli-Pad',
      ],
    },
  ],
};
