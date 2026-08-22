import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Ground, cliffs and water edges — the field a level is laid on, rather than anything standing on it.
 *
 * The category BUILDING could not cover. BUILDING is labelled "Building / Environment Tile" and does
 * own a tile plan, but read what that plan asks for: a floor, a wall top, a wall face, and outer and
 * inner corners of each. That is a room with walls around it, and the thing it cannot express is the
 * one a terrain sheet is entirely about — *two materials meeting*, and the edge and corner tiles that
 * let one wash into the other across open ground. BUILDING keeps the environment art that is a
 * discrete object placed on a field — a tree, a parallax band, a bridge span — because those
 * decompose as structures; the field itself decomposes as a blend set and comes here.
 *
 * **No option in these pools states a tile count**, and `Tile Assembly Base` is where that costs
 * something. The autotiling families are conventionally named by their size — a 47-tile blob set, a
 * 16-tile Wang set, a nine-patch — and naming one in section 1 would put a number beside section 0's
 * binding "Exactly N components", which is the §1-says-one-thing/§0-says-another contradiction the
 * per-category records exist to remove. So each option names the *matching discipline* stripped of
 * its count — `Framed Platform Set` for the nine-patch, `Uniform Self-Tiling Field` for the single
 * tile that needs no transitions — and the sheet plan is left to say how many pieces there are.
 */
export const TERRAIN: CategoryDefinition = {
  label: 'Terrain / Ground Tile',
  article: 'a',
  fields: [
    {
      key: 'species',
      label: 'Terrain Type',
      tooltip:
        'What the ground itself is. It fixes the material read and the shape of every boundary before any styling is applied — grass, scree and lava crust wash into a neighbouring material in completely different ways.',
      options: [
        'Grassland & Meadow',
        'Bare Earth & Dirt Track',
        'Desert Sand & Dune',
        'Snowfield & Ice Sheet',
        'Cavern Floor & Bedrock',
        'Volcanic Crust & Ash',
        'Shallow Water & Wetland',
        'Scree Slope & Gravel',
        'Forest Floor & Leaf Litter',
        'Marsh & Peat Bog',
        'Salt Flat & Cracked Pan',
        'Paved Road & Cobble',
      ],
    },
    {
      key: 'gender',
      label: 'Biome State',
      tooltip:
        'The condition the biome is in, which is what turns one terrain into a set. The same grassland lush, blighted and frozen is three tile sets off one design, and a level that changes state without changing layout is the cheapest scene change a game gets.',
      options: [
        'Lush & Thriving',
        'Dry & Parched',
        'Blighted & Corrupted',
        'Frozen Over',
        'Scorched & Burned',
        'Flooded & Waterlogged',
        'Ash-Covered',
        'Freshly Tilled',
      ],
    },
    {
      key: 'age',
      label: 'Weathering & Erosion',
      tooltip:
        'How long the ground has been exposed, read as erosion rather than as dirt. It governs edge softness above all: a freshly cut bank has a hard lip where a weathered one is rounded and shedding, and that difference shows at every tile boundary.',
      options: [
        'Freshly Cut & Sharp-Edged',
        'Lightly Weathered',
        'Heavily Eroded & Rounded',
        'Wind-Scoured',
        'Water-Carved & Channelled',
        'Frost-Shattered',
        'Overgrown & Reclaimed',
      ],
    },
    {
      key: 'role',
      label: 'Playfield Role',
      tooltip:
        'What the ground does to whoever stands on it. Walkable, blocking, hazardous and transitional ground have to be told apart instantly and without a legend, so this decides how much of the set’s contrast budget is left for decoration.',
      options: [
        'Walkable Ground',
        'Blocking Obstacle',
        'Hazard & Damage Surface',
        'Transition Between Zones',
        'Slow Or Difficult Going',
        'Water Crossing',
        'Cover & Concealment',
        'Decorative Backdrop Ground',
      ],
    },
    {
      key: 'setting',
      label: 'Art Style Theme',
      tooltip:
        'The design language the whole set is drawn in. It aligns edge treatment, noise density and colour temperature across every tile at once — a painterly forest and a hard-edged colony deck rarely share a level without looking like two games.',
      options: [
        'High Fantasy Wilderness',
        'Grim Dark Ruin',
        'Bright Cartoon Overworld',
        'Hard Sci-Fi Colony',
        'Post-Apocalyptic Waste',
        'Cosy Farming Valley',
        'Alien Bioluminescent World',
        'Historical Rural Countryside',
      ],
    },
    {
      key: 'build',
      label: 'Tile Scale & Density',
      tooltip:
        'How much world one tile holds, and how busy it is. Worth setting against the resolution profile rather than in isolation: the same blade of grass is a readable tuft at one tile size and noise at another, and a field of noise reads as flat colour from any distance.',
      options: [
        'Fine Grain, Dense Detail',
        'Medium Grain, Balanced',
        'Coarse Grain, Bold Shapes',
        'Chunky Low-Resolution Blocks',
        'Sparse & Near-Flat',
        'Large Tile, One Feature Each',
      ],
    },
    {
      key: 'silhouette',
      label: 'Edge & Cliff Profile',
      tooltip:
        'The shape the boundary takes where one material stops and the next begins, and where the ground steps up. That boundary is the only line in a terrain set the eye actually follows, so a ragged organic edge and a hard geometric one give different sets from identical materials.',
      options: [
        'Soft Organic Feathered Edge',
        'Ragged Torn Boundary',
        'Hard Geometric Straight Cut',
        'Stepped Terrace Lip',
        'Overhanging Undercut Cliff',
        'Crumbling Broken Verge',
        'Rounded Rolling Bank',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Feature',
      tooltip:
        'The one thing the eye lands on — the hero rock, the water surface, the glowing vent. Every other piece in the set is written to go unnoticed, so this is where a terrain sheet is allowed to be distinctive, and it belongs on a piece placed once rather than on a tile that repeats.',
      options: [
        'Hero Boulder Outcrop',
        'Still Water Surface',
        'Glowing Vent Or Fissure',
        'Ancient Standing Stone',
        'Gnarled Exposed Root Mass',
        'Crystal Formation',
        'Bubbling Spring Head',
        'Cracked Impact Crater',
      ],
    },
    {
      key: 'anatomy',
      label: 'Tile Assembly Base',
      tooltip:
        'How an autotiler is meant to index the set. Choose by how the pieces will be *placed* — a corner-matched set blends two materials in any arrangement, a nine-patch frames one rectangular platform — because the discipline decides which boundaries have to be drawn at all. It names a discipline rather than a tile count; the sheet’s own inventory is what fixes how many pieces there are.',
      options: [
        'Corner-Matched Blob Set',
        'Edge-Matched Wang Set',
        'Framed Platform Set',
        'Uniform Self-Tiling Field',
        'Terraced Elevation Set',
        'Freestanding Feature Pieces',
      ],
    },
    {
      key: 'clothing',
      label: 'Scatter Layer',
      tooltip:
        'The loose material lying on the ground — pebbles, tufts, twigs, drifts. It is what one base tile’s variants differ in, and therefore what keeps a field from reading as a single tile stamped in rows, so it is painted onto the tiles rather than drawn as pieces laid over them.',
      options: [
        'Pebble & Stone Scatter',
        'Grass Tufts & Weeds',
        'Fallen Twigs & Leaf Drift',
        'Snow Drift & Ice Crust',
        'Ash Fall & Cinder',
        'Wildflower Patches',
        'Rubble & Broken Masonry',
        'Fungal Caps & Bracket Growth',
      ],
    },
    {
      key: 'worn_details',
      label: 'Surface Motifs',
      tooltip:
        'The small marks repeated across the field — cracks, tufts, pebble runs, ripples. They are painted onto the tiles rather than drawn as pieces, and they are the first thing to give a tiled field away: a motif bold enough to notice is a motif a player will count.',
      options: [
        'Hairline Cracks & Fractures',
        'Pebble Runs & Grit',
        'Grass Blade Clusters',
        'Wind Ripples & Drift Lines',
        'Root Traces & Burrows',
        'Frost Patterning',
        'Dry Mud Polygons',
        'Moss Patches & Lichen',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant ground colours the whole field is read against. Terrain fills most of the screen, so these want to sit *quieter* than anything standing on them — a ground plane carrying as much contrast as the sprites will swallow them.',
      options: [
        'Meadow Green & Loam Brown',
        'Sun-Bleached Sand & Ochre',
        'Snow White & Slate Grey',
        'Basalt Black & Ash Grey',
        'Peat Brown & Sedge Olive',
        'Rust Red Rock & Dust',
        'Deep Teal Water & Wet Sand',
        'Cave Stone Grey & Damp Umber',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The few saturated notes the field is allowed — flowering, mineral veins, lava in a crack, bioluminescence. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Wildflower Yellow #FACC15',
        'Lava Crack Orange #EA580C',
        'Mineral Vein Cyan #06B6D4',
        'Bioluminescent Violet #A855F7',
        'Blighted Crimson #DC2626',
        'Shallow Water Teal #14B8A6',
        'Frost Highlight White',
      ],
    },
    {
      key: 'materials',
      label: 'Ground Materials',
      tooltip:
        'What the ground is made of, and how light reads off it: wet stone takes a hard sheen, dry soil none at all, snow scatters it. Under flat neutral lighting the material read is the only thing separating one tile from the next, so the two materials a blend set joins want different surface behaviour and not merely different hues.',
      options: [
        'Soil, Turf & Root Mat',
        'Dry Sand & Wind-Packed Dust',
        'Wet Stone & Standing Water',
        'Packed Snow & Blue Ice',
        'Fractured Basalt & Cinder',
        'Clay, Silt & Cracked Mud',
        'Loose Gravel & Shale',
        'Cut Flagstone & Mortar',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the inhabitants, the sky and the scene off a tile sheet. A composed landscape is the one to guard against here: asked for terrain, a generator draws a *view* of it, and a view cannot be cut into tiles.',
      options: [
        'No characters, creatures or vehicles',
        'No buildings, fences or structures',
        'No sky, horizon or distant background',
        'No composed landscape scene or vista',
        'No cast shadow or grid overlay on a tile',
        'No characters, no buildings, no sky, no cast shadow',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Tiles',
      tooltip:
        'Extra tiles or landform pieces beyond the set the sheet already asks for — a path run, a ford, a fallen log. Comma-separated, with ×N for how many of each: “Stepping Stone ×3, Ford Crossing ×1” adds four components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Stepping Stone ×3, Ford Crossing ×1',
        'Dirt Path Straight ×2, Path Corner ×2',
        'Fallen Log Bridge ×1',
        'Frozen Puddle ×2, Snow Drift ×2',
        'Lava Flow Straight ×2, Lava Pool ×1',
        'Cave Entrance Mouth ×1',
      ],
    },
  ],
};
