import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { ABSENT_OPTION_DROPS_THE_PIECES, HEX_CODE_PINS_THE_HUE } from '../guidanceSentences.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Backdrops and parallax layers — the bands of scenery that scroll behind the playfield, and the
 * static panels a title screen or a cutscene is drawn on.
 *
 * **The gap it fills is the one TERRAIN cannot.** A terrain tile is ground the player stands on,
 * laid flat and read from above; a background band is scenery the player never reaches, drawn as a
 * flat elevation and scrolled at its own rate. Neither is expressible as the other, and every asset
 * library that sells 2D art lists them apart — "Backgrounds" is a top-level category beside
 * "Tilesets" wherever you look.
 *
 * **This is the third category whose components *are* the environment**, and its section 8 says so
 * the way BUILDING's and TERRAIN's do: it bans the inhabitants and the playfield instead of banning
 * scenery, because banning scenery here would forbid the whole subject. `promptText/exclusions.ts`
 * carries that, and `sheetPlans.test.ts` derives the exemption from the wording rather than from a
 * list somebody keeps.
 *
 * **One camera, one facing, and the tiling axis is horizontal.** A backdrop is a plane seen straight
 * on, so `categoryProjections.ts` binds it to `ORTHOGRAPHIC_FRONT` and `categoryDirectionSets.ts` to
 * `SINGLE_FRONT` — a band has no far side to turn to, and asking for eight yaws of one would return
 * eight drawings of the same plane. What *does* repeat is the run: a parallax band butts against its
 * own copy along its length, which is what makes `TILESET_MODULAR` this category's default sheet
 * rather than an alternative to it.
 *
 * **`Focal Landmark` is the field that can contradict the deliverable**, and its tooltip says so
 * rather than leaving it to be discovered: a band meant to repeat cannot carry anything a player
 * would recognise twice, so a landmark belongs on a non-repeating panel or on a loose overlay drawn
 * once. That is the same rule TERRAIN's exclusion line states for a tile, arrived at from the other
 * direction.
 */
export const BACKGROUND: CategoryDefinition = {
  label: 'Background / Parallax Layer',
  article: 'a',
  fields: [
    {
      key: 'species',
      label: 'Layer Type',
      tooltip:
        'What this band is a band of. It decides the component split before any styling does, because what a layer has to do fixes how it comes apart — a sky plane is one unbroken gradient, a treeline is a repeating profile, and a foreground occluder is a strip with holes in it that the player walks behind.',
      options: [
        'Sky & Cloud Band',
        'Distant Horizon & Mountain Range',
        'Mid-Distance Skyline & Rooftops',
        'Near Treeline & Hedgerow',
        'Foreground Occluder Strip',
        'Interior Wall & Window Run',
        'Cave Depth & Stalactite Band',
        'Underwater Column & Kelp',
        'Starfield & Nebula Field',
        'Full Static Scene Panel',
        'Distant City Wall & Gate',
        'Rolling Farmland Band',
        'Industrial Pipework Band',
        'Ruined Colonnade Row',
      ],
    },
    {
      key: 'gender',
      label: 'Depth Tier',
      tooltip:
        'How far back this layer sits, which is the same thing as how fast it scrolls. Tier is what governs contrast and detail more than distance does — a far band is desaturated towards the sky colour and carries almost no internal detail, and a band drawn at full contrast at the back fights the playfield in front of it.',
      options: [
        'Furthest Sky Plane, Fixed',
        'Far Parallax, Slowest',
        'Mid Parallax',
        'Near Parallax, Fastest',
        'Foreground Overlay, Ahead Of Play',
        'Static Non-Scrolling Panel',
        'Second Far Plane, Slow',
        'Interior Wall Plane, Fixed',
      ],
    },
    {
      key: 'age',
      label: 'Weather, Season & Time',
      tooltip:
        'The conditions the scene is drawn under. It settles the sky, the palette and the haze together, and stating it apart from the world is what lets one setting ship as a dawn set and a storm set rather than being redrawn twice from scratch.',
      options: [
        'Clear Midday',
        'Golden Hour & Long Light',
        'Overcast & Flat Light',
        'Night & Moonlit',
        'Rain & Low Cloud',
        'Snowfall & Winter Bare',
        'Fog & Heavy Haze',
        'Dust Storm & Ochre Sky',
        'Ash Fall & Ember Glow',
        'High Summer Growth',
        'Dawn Mist & Cool Blue',
        'Blossom Spring Bloom',
        'Autumn Turn & Leaf Fall',
        'Storm Front & Lightning',
      ],
    },
    {
      key: 'role',
      label: 'Scene Purpose',
      tooltip:
        'What the backdrop is behind. Purpose is what decides how quiet the art has to be — a combat arena backdrop must lose to the sprites in front of it, where a title screen is the only thing on the screen and can carry the whole composition.',
      options: [
        'Establishing Vista',
        'Combat Arena Backdrop',
        'Town & Safe Zone',
        'Dungeon & Interior Depth',
        'Boss Chamber',
        'Title & Menu Backdrop',
        'Cutscene & Dialogue Backdrop',
        'Level Transition & Loading',
        'Endless Runner Loop',
        'Shop & Vendor Interior Backdrop',
        'Credits & End Card',
        'Victory & Defeat Screen',
        'Puzzle Room Backdrop',
      ],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The world the scenery belongs to. It aligns architecture, vegetation and sky across every band at once, which is most of what makes a stack of layers read as one place rather than as several.',
      options: [
        'High Fantasy Wilderness',
        'Grim Dark Ruin',
        'Medieval Village & Farmland',
        'Age Of Sail Harbour',
        'Victorian Industrial City',
        'Wild West Desert',
        'Modern Urban Sprawl',
        'Near-Future Cyberpunk Street',
        'Far-Future Orbital & Void',
        'Post-Apocalyptic Waste',
        'Tropical Island & Reef',
        'Frozen Tundra & Ice Shelf',
        'Feudal East Asia Countryside',
        'Mesoamerican Jungle Ruin',
        'Alpine Valley & Meadow',
        'Deep Ocean Trench',
      ],
    },
    {
      key: 'build',
      label: 'Band Proportions & Repeat Length',
      tooltip:
        'How tall the band is against the screen, and how long a run of it goes before it repeats. A short repeat is cheap and gives itself away; a long one costs texture memory and hides the loop. State it, because a generator left to choose returns whatever composition looked best and no repeat length at all.',
      options: [
        'Short Repeat, One Screen Wide',
        'Standard Repeat, Two Screens Wide',
        'Long Repeat, Four Screens Wide',
        'Shallow Band Across The Top',
        'Shallow Band Across The Bottom',
        'Full-Screen Single Panel',
        'Tall Vertical Column',
        'Half-Screen Mid Band',
        'Two Screens Tall Vertical Run',
      ],
    },
    {
      key: 'silhouette',
      label: 'Skyline Profile',
      tooltip:
        'The outline the band reads as against whatever is behind it. At parallax distance the profile is the whole identity — a jagged ridge, a flat plateau, a broken roofline — because everything inside it has been flattened towards one value by the haze.',
      options: [
        'Flat Level Horizon',
        'Rolling Soft Hills',
        'Jagged Mountain Ridge',
        'Broken Urban Roofline',
        'Spired Towers & Masts',
        'Ragged Ruin & Collapse',
        'Dense Irregular Canopy',
        'Sheer Cliff Wall',
        'Open Sky, No Profile',
        'Terraced Field Steps',
        'Pagoda Roof Cluster',
        'Industrial Chimney Row',
        'Wave Crest Line',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Landmark',
      tooltip:
        'The one distinctive thing on the band — a castle on the ridge, a moon, a wrecked ship. A band meant to repeat can carry none of these, because a player who recognises it once will recognise it every screen: put a landmark on a non-repeating panel or on a loose overlay drawn once, or choose none at all.',
      options: [
        'No Landmark — Fully Repeatable',
        'Distant Castle & Keep',
        'Broken Tower & Rubble',
        'Moon & Ringed Planet',
        'Wrecked Ship & Hulk',
        'Colossal Statue',
        'Volcano & Ash Plume',
        'Orbital Station & Elevator',
        'Great Tree',
        'Lighthouse & Beacon',
        'Windmill On A Rise',
        'Ringed Gas Giant Low In The Sky',
        'Crashed Airship Wreck',
        'Waterfall Down A Cliff Face',
      ],
    },
    {
      key: 'anatomy',
      label: 'Layer Assembly Base',
      tooltip:
        'How the deliverable is cut so the engine can scroll it. Choose by which way it has to repeat — a seamless band loops along one axis for ever, a stacked set is several bands scrolled at different rates, and a single panel never repeats at all and is sized to the screen instead.',
      options: [
        'Single Non-Repeating Panel',
        'Horizontally Seamless Band',
        'Vertically Seamless Column',
        'Seamless Band With Loose Overlays',
        'Stacked Depth Layers',
        'Seamless Band With Matched End Caps',
        'Seamless Band With Parallax Sub-Layers',
        'Panel Split Into Left And Right Halves',
      ],
    },
    {
      key: 'clothing',
      label: 'Applied Atmosphere',
      tooltip:
        'What is laid over the band as its own separate piece — a fog bank, a rain veil, shafts of light, drifting motes. Kept apart from the band itself so the engine can scroll it at a different rate or fade it out, which is the whole reason to draw it separately. ' +
        ABSENT_OPTION_DROPS_THE_PIECES,
      options: [
        'Clear — No Overlay',
        'Low Fog Bank',
        'Rain Veil & Streaks',
        'Falling Snow Drift',
        'Shafts Of Light Through Gaps',
        'Drifting Embers & Motes',
        'Blowing Leaves & Petals',
        'Heat Shimmer Band',
        'Drifting Cloud Wisps',
        'Lightning Flash Frames',
        'Rolling Sea Spray',
      ],
      absentOption: 'Clear — No Overlay',
    },
    {
      key: 'worn_details',
      label: 'Surface Texture',
      tooltip:
        'What the flat areas of the band carry, if anything. A background is looked past rather than at, so a quiet surface is usually the right answer — and every texture costs palette budget the playfield in front needs more.',
      options: [
        'Clean Untextured Fields',
        'Soft Painterly Blocking',
        'Visible Brush Texture',
        'Hatched & Cross-Hatched Shading',
        'Dithered Gradient Bands',
        'Flat Cel Blocking, Hard Edges',
        'Grainy Paper Tooth',
        'Halftone Dot Screen',
        'Woodblock Print Line Work',
        'Soft Airbrush Gradients',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the band — the sky and the largest mass beneath it. These have to sit far enough from the playfield’s own palette that a sprite never disappears against them, which is the failure a beautiful backdrop most often causes.',
      options: [
        'Dawn Rose & Pale Gold',
        'Clear Cobalt & Cloud White',
        'Overcast Grey & Slate Green',
        'Night Indigo #1E1B4B & Deep Blue',
        'Desert Ochre & Bleached Sand',
        'Toxic Green Haze & Rust',
        'Deep Teal Water & Sunlit Surface',
        'Ash Grey & Ember Orange',
        'Spring Green & Blossom Pink',
        'Storm Slate & Sea Foam',
        'Jungle Emerald & Wet Stone',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The small bright notes carried by lit windows, lanterns and reflections. ' + HEX_CODE_PINS_THE_HUE,
      options: [
        'Lantern Amber #F59E0B',
        'Lit Window Warm White',
        'Neon Magenta #E879F9',
        'Signal Cyan #22D3EE',
        'Moonlit Silver #CBD5E1',
        'Molten Orange #EA580C',
        'Bioluminescent Green #4ADE80',
        'Arcane Violet #8B5CF6',
        'Lightning Flash White',
        'Blossom Pink #FBCFE8',
        'Distant Window Gold #FBBF24',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the scenery is made of and how light reads off it at distance: wet stone holds a broad sheen, foliage scatters into a soft mass, and glass returns the sky rather than its own colour. It is what keeps three bands of the same value from merging into one.',
      options: [
        'Weathered Stone & Moss',
        'Timber, Thatch & Plaster',
        'Brick, Iron & Soot',
        'Glass, Steel & Concrete',
        'Living Foliage & Bark',
        'Dry Rock & Drifting Sand',
        'Ice, Snow & Frozen Rock',
        'Corroded Alloy & Cabling',
        'Water, Silt & Weed',
        'Wet Clay Terraces & Rice Water',
        'Carved Jungle Stone & Vine',
        'Painted Timber & Whitewash',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the playfield’s job off the backdrop. Playable geometry is the one that matters most: a platform painted into the far band is one the player will try to stand on, and a ledge that is scenery is a bug report rather than a drawing.',
      options: [
        'No playable platforms, ledges or collision geometry',
        'No characters, creatures or vehicles',
        'No interface, logo or lettering',
        'No visible seam where the band repeats',
        'No foreground props the player could mistake for pickups',
        'No vignette, letterbox or camera border',
        'No sun or moon disc in the band',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Layers',
      tooltip:
        'Further bands or overlays beyond the ones the sheet already lists, each isolated into its own sprite slot so the engine can scroll it at its own rate. Comma-separated, with ×N for how many of each: “Distant Birds ×2, Falling Leaf ×3” adds five components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Distant Birds ×2',
        'Falling Leaf ×3',
        'Drifting Cloud Wisp ×2, Sun Disc ×1',
        'Reflection Strip ×1',
        'Foreground Grass Tuft ×3',
        'Distant Windmill Sail ×1',
        'Blossom Petal ×4',
        'Lightning Flash Frame ×2',
        'Wave Crest ×3',
      ],
    },
  ],
};
