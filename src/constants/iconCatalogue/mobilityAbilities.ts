import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The abilities that move a character: a dash, a blink, a leap, a grapple and a sprint.
 *
 * **Each movement is drawn as the gear or the effect that makes it, so the five never share a silhouette.**
 * A dash is a short burst from a heel, a leap a compressed spring, a sprint a sustained drive and a
 * grapple a line pulled taut, and none of them is the grappling hook the tools shelf carries. Every one
 * is kinetic, the physical school, because the body does the work; the blink alone is netrun, the
 * arcane school, because it folds space rather than crossing it.
 */
export const MOBILITY_ABILITIES: IconCatalogueGroup = {
  id: 'mobility-abilities',
  label: 'Mobility abilities',
  kind: 'SPELL',
  entries: [
    {
      id: 'ability-dash',
      role: 'Dash',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a winged silver boot kicking off in a sharp gust of wind',
        AGE_OF_STEAM: 'a brass steam-jet boot with a piston heel venting one hard blast of steam',
        MODERN: 'a black carbon-plated running shoe kicking up a spray of grit',
        CYBERPUNK:
          'a brushed-steel cyber-boot with twin heel thrusters firing a short grey kinetic burst and a spray of sparks',
        SPACE_OPERA: 'a white jump-jet pack firing a single short burst from its twin nozzles',
      },
    },
    {
      id: 'ability-blink',
      role: 'Blink teleport',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a pair of shimmering pink portal rings joined by a leaping arc of sparks',
        AGE_OF_STEAM: 'a brass transference coil flinging a pink spark between two copper rings',
        MODERN: 'a black smartphone with a pink location pin leaping along a dotted arc',
        CYBERPUNK:
          'a brushed-steel phase-shift implant module glitching apart into hot-pink pixel fragments, its afterimage reassembling a short jump away',
        SPACE_OPERA: 'a white phase-gate ring with a hot-pink wormhole iris swirling at its centre',
      },
    },
    {
      id: 'ability-leap',
      role: 'Leap',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a winged silver greave springing upward from a burst of dust',
        AGE_OF_STEAM: 'a coiled brass spring heel on a riveted iron sole, bounding up in a puff of steam',
        MODERN: 'a fibreglass vaulting pole bent into a tall arc',
        CYBERPUNK:
          'a brushed-steel hydraulic jump-piston with its coiled strut compressed, launching upward on a cone of grey exhaust',
        SPACE_OPERA: 'a white grav-boot sole blooming a ring of grey anti-gravity light',
      },
    },
    {
      id: 'ability-grapple',
      role: 'Grapple',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a spectral iron chain whipping out in an arc to a barbed spearhead',
        AGE_OF_STEAM: 'a steam-driven iron winch drum reeling in a taut riveted chain',
        MODERN: 'a motorised rope ascender clamped onto a taut steel cable',
        CYBERPUNK:
          'a brushed-steel grapple launcher firing a barbed spike on a taut gunmetal monofilament line, the spike’s barbs flared open',
        SPACE_OPERA: 'a white magnetic grapple anchor reeling in a chain of linked grey energy rings',
      },
    },
    {
      id: 'ability-sprint',
      role: 'Sprint',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a silver horseshoe ringed by a gusting spiral of wind',
        AGE_OF_STEAM: 'a brass steam turbine with its rotor spinning hard and steam whistling from its valve',
        MODERN: 'a carbon-fibre running blade prosthesis standing alone, its curve flexed as if mid-stride',
        CYBERPUNK:
          'a brushed-steel sprint-servo actuator pack with spinning brushed-steel turbine vents and a fan of sparks thrown out behind it',
        SPACE_OPERA: 'a white speed-boost emitter streaming three stacked grey chevrons of light',
      },
    },
  ],
};
