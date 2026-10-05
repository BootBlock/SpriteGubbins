import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The objectives and zones a multiplayer match is fought over: a capture point, a payload to escort, an
 * uplink to hack, the extraction and drop zones, a bomb site and its defusal, the shrinking safe zone,
 * a restricted zone, a supply drop and a vault to rob.
 *
 * **Each objective is told apart by its outline alone,** because an engine draws them over the world
 * and on the minimap, often as a grey tint mask coloured by team. So no two share an object in one
 * world, and the capture point is a single pick drawn in both of its states only because its shape
 * changes: whole while neutral, and broken apart while contested.
 */
export const OBJECTIVES: IconCatalogueGroup = {
  id: 'objectives',
  label: 'Objectives and zones',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'objective-capture-point',
      role: 'Capture point',
      states: ['neutral', 'contested'],
      looks: {
        FANTASY:
          'a ring of standing stones around a planted iron spear, and the same ring broken by a wide jagged gap for the second state',
        AGE_OF_STEAM:
          'a brass flagpole planted in a riveted iron ring, and the same flagpole leaning with its ring split by a jagged crack for the second state',
        MODERN:
          'a plain hollow hexagon with a solid dot at its centre, and the same hexagon split into two halves by a jagged gap for the second state',
        CYBERPUNK:
          'a gunmetal hexagon zone marker ringed in steady neon-cyan light, and the same hexagon fractured into glitching neon-red shards for the second state',
        SPACE_OPERA:
          'a white capture pylon inside a steady blue force ring, and the same pylon inside a ring broken into flickering arcs for the second state',
      },
    },
    {
      id: 'objective-payload',
      role: 'Payload escort target',
      looks: {
        FANTASY: 'a covered wooden siege cart on iron-rimmed wheels',
        AGE_OF_STEAM: 'a riveted brass rail wagon with a boiler on its bed',
        MODERN: 'a squat armoured cargo truck with six heavy wheels',
        CYBERPUNK:
          'a matte black armoured payload pod on tracked treads with a neon-amber beacon on its roof',
        SPACE_OPERA: 'a white hover-sled carrying a sealed cargo cylinder',
      },
    },
    {
      id: 'objective-hack-uplink',
      role: 'Hack uplink terminal',
      looks: {
        FANTASY: 'a tall scrying obelisk with a glowing blue crystal set into its tip',
        AGE_OF_STEAM: 'a brass telegraph relay cabinet with a crackling copper antenna',
        MODERN: 'a rugged server tower with a tall radio antenna and a blinking green light',
        CYBERPUNK: 'a gunmetal uplink terminal with a tall antenna mast throwing off neon-cyan data sparks',
        SPACE_OPERA: 'a white relay spire with a spinning blue holographic dish',
      },
    },
    {
      id: 'objective-extraction',
      role: 'Extraction zone',
      looks: {
        FANTASY: 'a swirling blue portal of light inside a ring of standing stones',
        AGE_OF_STEAM: 'a brass dirigible gondola trailing a rope ladder',
        MODERN: 'a twin-rotor transport helicopter with its rear ramp lowered',
        CYBERPUNK: 'a matte black vertical-take-off gunship with twin neon-cyan thruster pods',
        SPACE_OPERA: 'a white dropship with its ramp lowered and blue landing lights',
      },
    },
    {
      id: 'objective-drop-zone',
      role: 'Drop zone',
      looks: {
        FANTASY: 'a pair of feathered wings descending over a round stone dais',
        AGE_OF_STEAM: 'a brass-ribbed balloon basket descending on a tether',
        MODERN: 'a bold downward arrow landing on a circular landing pad',
        CYBERPUNK: 'a neon-cyan downward arrow beam striking a hexagonal gunmetal landing pad',
        SPACE_OPERA: 'a white drop pod falling in a cone of blue light',
      },
    },
    {
      id: 'objective-bomb-site',
      role: 'Bomb site',
      looks: {
        FANTASY: 'a black iron powder keg with a lit fuse',
        AGE_OF_STEAM: 'a round black iron bomb with a hissing fuse',
        MODERN: 'a bundle of three explosive charges strapped together with wires',
        CYBERPUNK: 'a gunmetal breaching charge with a blinking neon-red light and coiled wires',
        SPACE_OPERA: 'a white antimatter mine with a pulsing red core',
      },
    },
    {
      id: 'objective-defuse',
      role: 'Defuse',
      looks: {
        FANTASY: 'a pair of iron shears snipping a burning fuse',
        AGE_OF_STEAM: 'a pair of brass wire cutters with a snipped red wire',
        MODERN: 'a pair of wire cutters severing a red wire',
        CYBERPUNK: 'a pair of gunmetal wire snips over a severed neon-red cable',
        SPACE_OPERA: 'a white defusal probe with a blue spark at its tip',
      },
    },
    {
      id: 'objective-safe-zone',
      role: 'Shrinking safe zone',
      looks: {
        FANTASY: 'a dome of soft blue warding light shrinking inward',
        AGE_OF_STEAM: 'a brass iris shutter half closed around a circle of light',
        MODERN: 'a solid circle with a smaller dashed circle inside it and four arrows pointing inward',
        CYBERPUNK: 'a contracting neon-blue storm dome with glitch static rippling across its surface',
        SPACE_OPERA: 'a white force-field sphere contracting around a small blue core',
      },
    },
    {
      id: 'objective-restricted-zone',
      role: 'Restricted zone',
      looks: {
        FANTASY: 'a row of sharpened wooden stakes',
        AGE_OF_STEAM: 'a barbed iron railing with a red warning lamp',
        MODERN: 'a coil of razor wire on a striped hazard barrier',
        CYBERPUNK: 'a gunmetal laser fence of crossed neon-red beams',
        SPACE_OPERA: 'a red no-entry energy barrier between two white pylons',
      },
    },
    {
      id: 'objective-supply-drop',
      role: 'Supply drop',
      looks: {
        FANTASY: 'a wooden supply crate lowered on ropes by a great eagle',
        AGE_OF_STEAM: 'a canvas parachute carrying a brass-bound supply crate',
        MODERN: 'a cargo crate hanging beneath an olive parachute',
        CYBERPUNK: 'a gunmetal supply drone with a hard case clamped beneath it and neon-amber rotor lights',
        SPACE_OPERA: 'a white supply capsule falling with a trail of blue flame',
      },
    },
    {
      id: 'objective-vault',
      role: 'Heist vault target',
      looks: {
        FANTASY: 'a round iron vault door with a heavy wheel lock',
        AGE_OF_STEAM: 'a heavy cast-iron safe with a brass spoked wheel',
        MODERN: 'a round steel bank vault door with a spoked wheel handle',
        CYBERPUNK: 'a matte black corporate vault hatch with a neon-gold lock ring and a cyan scanner',
        SPACE_OPERA: 'a white armoured treasury core inside a gold energy cage',
      },
    },
  ],
};
