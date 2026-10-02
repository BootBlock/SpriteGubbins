import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Consumables that lift one attribute for a while: a stat, a defence, a pace, a resistance or a sense.
 *
 * **Each boost owns one colour and keeps it in every family.** A buff bar shows several at once and a
 * player reads them by hue before shape, so strength is orange, agility green and intellect violet
 * whether the object is a flask, a pill strip or an injector.
 */
export const BOOSTS: IconCatalogueGroup = {
  id: 'boosts',
  label: 'Boosts',
  kind: 'ITEM',
  entries: [
    {
      id: 'boost-strength',
      role: 'Strength boost',
      looks: {
        FANTASY: 'a squat iron-banded flask of thick orange draught with a leather thong at its neck',
        AGE_OF_STEAM: 'a brass-capped glass ampoule of orange muscle tonic in a riveted steel cradle',
        MODERN: 'a black tub of protein powder with an orange screw lid',
        CYBERPUNK:
          'a chunky orange myo-boost injector with a chrome hydraulic piston and a glowing orange pressure gauge',
        SPACE_OPERA: 'an orange gravity-trainer capsule clasped in a white alloy band, glowing at both ends',
      },
    },
    {
      id: 'boost-agility',
      role: 'Agility boost',
      looks: {
        FANTASY: 'a slender glass vial of bright green draught with a feather tied to its cork',
        AGE_OF_STEAM: 'a tiny brass atomiser of green reflex tincture with a rubber squeeze bulb',
        MODERN: 'a green energy-gel tube with a twist-off cap',
        CYBERPUNK:
          'a lime-green reflex-wire injector pen with a coiled chrome tip and a pulsing green diode strip',
        SPACE_OPERA: 'a slim green synapse-accelerator pod with a white tail fin and a trail of green sparks',
      },
    },
    {
      id: 'boost-intellect',
      role: 'Intellect boost',
      looks: {
        FANTASY: 'a tall violet glass vial of clarity draught with a cut-crystal stopper',
        AGE_OF_STEAM: 'a hinged brass snuff tin of violet focus powder with a domed lid',
        MODERN: 'a foil-backed blister strip of violet focus capsules',
        CYBERPUNK: 'a violet neural-booster chip with gold pins and a glowing violet core trace',
        SPACE_OPERA: 'a violet psionic amplifier crystal mounted on a slim white circlet clasp',
      },
    },
    {
      id: 'boost-armour',
      role: 'Armour boost',
      looks: {
        FANTASY: 'a stout iron flask of grey stoneskin draught with a riveted steel stopper',
        AGE_OF_STEAM: 'a riveted iron plate-hardening canister with a brass pressure valve',
        MODERN: 'a grey ballistic armour plate with black webbing straps',
        CYBERPUNK:
          'a steel-grey dermal-plating injector with a hexagonal chrome barrel and a glowing blue plating gauge',
        SPACE_OPERA: 'a white hexagonal shield-emitter puck projecting a dome of pale blue light',
      },
    },
    {
      id: 'boost-move-speed',
      role: 'Movement speed boost',
      looks: {
        FANTASY: 'a pair of soft leather boots with silver spurs and swirling wind trails',
        AGE_OF_STEAM: 'a pair of brass-sprung pneumatic boots with copper pistons at the heels',
        MODERN: 'a white running shoe with a bright orange sole',
        CYBERPUNK: 'a chrome sprint-servo cartridge with twin cyan exhaust vents and swept-back speed fins',
        SPACE_OPERA: 'a white hover-step boot with a glowing blue repulsor pad under its sole',
      },
    },
    {
      id: 'boost-attack-speed',
      role: 'Attack speed boost',
      looks: {
        FANTASY: 'a bright red flask of frenzy draught with a forked crack of light inside',
        AGE_OF_STEAM:
          'a brass clockwork accelerator coil with a tightly wound mainspring and a red winding knob',
        MODERN: 'a small red energy-shot bottle with a lightning-bolt cap',
        CYBERPUNK: 'a red overclock module with a spinning cooling fan and glowing red heat vents',
        SPACE_OPERA: 'a red tachyon-pulse capsule circled by two spinning white bands of light',
      },
    },
    {
      id: 'boost-fire-resist',
      role: 'Fire resistance boost',
      looks: {
        FANTASY: 'a frosted blue glass vial of cooling draught with a snowflake charm at its neck',
        AGE_OF_STEAM: 'a round tin of blue fire-ward ointment with a riveted lid',
        MODERN: 'a folded silver fire-retardant foil blanket in a clear pouch',
        CYBERPUNK:
          'a blue thermal-sink injector with frosted chrome fins and a glowing ice-blue coolant window',
        SPACE_OPERA: 'a white thermal-ward capsule wrapped in a shimmering orange heat-shield field',
      },
    },
    {
      id: 'boost-experience',
      role: 'Experience gain boost',
      looks: {
        FANTASY: 'a thick leather tome with gilded corners and a gold star clasp',
        AGE_OF_STEAM: 'a polished brass gear medallion with a gold star at its centre',
        MODERN: 'a gold star-shaped medal on a blue ribbon',
        CYBERPUNK:
          'a gold data-shard with chrome contacts and a glowing gold star hologram hovering above it',
        SPACE_OPERA: 'a gold knowledge orb resting in a white cradle with a star-shaped core of light',
      },
    },
    {
      id: 'boost-stealth',
      role: 'Stealth boost',
      looks: {
        FANTASY: 'a folded grey shadow cloak with a silver crescent clasp',
        AGE_OF_STEAM: 'a smoked-glass vial of grey vanishing tonic in a black leather sheath',
        MODERN: 'a folded camouflage poncho with a drawstring',
        CYBERPUNK:
          'a matte-black optical-camo emitter with a shimmering refractive lens and a faint violet edge glow',
        SPACE_OPERA: 'a translucent cloaking-field generator puck shimmering half-invisible at its edges',
      },
    },
    {
      id: 'boost-night-vision',
      role: 'Night vision boost',
      looks: {
        FANTASY: 'a vial of luminous pale-green moonsight draught with a silver crescent charm',
        AGE_OF_STEAM: 'a pair of brass-rimmed goggles with green-tinted lenses',
        MODERN: 'a black night-vision monocular with a green-glowing lens',
        CYBERPUNK:
          'a chrome low-light optic implant with a glowing green aperture lens and gold contact pins',
        SPACE_OPERA: 'a white visor with a wraparound glowing green sensor band',
      },
    },
    {
      id: 'boost-water-breathing',
      role: 'Underwater breathing boost',
      looks: {
        FANTASY: 'a blue-green glass vial of brine draught with a pearl stopper',
        AGE_OF_STEAM: 'a brass diving helmet with round riveted portholes',
        MODERN: 'a yellow diving mask with an attached snorkel',
        CYBERPUNK:
          'a compact teal rebreather mouthpiece with twin scrubber cartridges and a glowing teal oxygen gauge',
        SPACE_OPERA: 'a white oxygen-field respirator with glowing blue intake vents',
      },
    },
  ],
};
