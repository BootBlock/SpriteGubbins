import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Consumables thrown at a spot rather than used on oneself: grenades, a throwing blade, a snare and a
 * decoy.
 *
 * **The effect is drawn in the colour of what it does.** Each throwable is drawn as a different object, so its
 * outline names it, and each carries its effect as a colour and a detail a player can read at a glance:
 * orange flame, blue frost, grey smoke, white flash and sickly green gas.
 */
export const THROWABLES: IconCatalogueGroup = {
  id: 'throwables',
  label: 'Throwables',
  kind: 'ITEM',
  entries: [
    {
      id: 'throw-frag-grenade',
      role: 'Fragmentation grenade',
      looks: {
        FANTASY: 'a round black clay bomb with a sputtering fuse',
        AGE_OF_STEAM: 'a cast-iron ball grenade with a brass fuse cap and a lit fuse',
        MODERN: 'an olive-green segmented frag grenade with a pull pin and a steel lever',
        CYBERPUNK:
          'a matte-black smart-frag grenade with a pulsing red proximity band and a brushed-steel pin',
        SPACE_OPERA: 'a white fragmentation orb with segmented plates and a blinking red arming light',
      },
    },
    {
      id: 'throw-incendiary',
      role: 'Incendiary throwable',
      looks: {
        FANTASY: 'a clay pot of oil with a burning rag stuffed in its neck',
        AGE_OF_STEAM: 'a glass bottle of lamp oil with a flaming rag wick',
        MODERN: 'a glass bottle of petrol with a burning rag wick and a red thermite band',
        CYBERPUNK: 'an orange napalm-gel canister with a hazard-striped cap and a glowing orange fuel window',
        SPACE_OPERA: 'an orange plasma-incendiary spindle split by molten seams of light',
      },
    },
    {
      id: 'throw-freeze',
      role: 'Freezing throwable',
      looks: {
        FANTASY: 'a frosted blue glass orb with swirling snow inside',
        AGE_OF_STEAM: 'a brass-capped glass ampoule of liquid ether rimed with frost',
        MODERN: 'a white aerosol can of freezing spray with a frosted nozzle',
        CYBERPUNK: 'a gunmetal cryo-sphere ringed with glowing cyan vents and a cyan coolant mist',
        SPACE_OPERA: 'a white cryo-prism wreathed in pale blue frost vapour with a glowing blue band',
      },
    },
    {
      id: 'throw-smoke',
      role: 'Smoke grenade',
      looks: {
        FANTASY: 'a cloth pouch of grey powder tied with cord, trailing smoke',
        AGE_OF_STEAM: 'a cardboard smoke candle with a twisted paper fuse',
        MODERN: 'a grey cylindrical smoke canister with a pull ring, trailing a white plume',
        CYBERPUNK:
          'a squat hexagonal black smoke charge with a pull tab, spilling violet-tinged smoke from its side vents',
        SPACE_OPERA: 'a white disc emitter venting a cloud of shimmering grey nanomist',
      },
    },
    {
      id: 'throw-stun',
      role: 'Stun grenade',
      looks: {
        FANTASY: 'a small glass sphere of trapped lightning in a copper wire cage',
        AGE_OF_STEAM: 'a magnesium flash cartridge with a brass striker cap',
        MODERN: 'a black cylindrical flashbang with a pull pin and a perforated casing',
        CYBERPUNK: 'a brushed-steel flashbang cube with a blinding blue strobe core and black corner caps',
        SPACE_OPERA: 'a white sonic-stun puck rippling with concentric glowing blue waves',
      },
    },
    {
      id: 'throw-blade',
      role: 'Throwing blade',
      looks: {
        FANTASY: 'a curved steel throwing dagger with a leather-wrapped grip',
        AGE_OF_STEAM: 'a fan of three brass-hilted throwing knives',
        MODERN: 'a matte-black throwing knife with a skeletonised grip',
        CYBERPUNK: 'a four-pointed brushed-steel throwing star with glowing crimson edges',
        SPACE_OPERA: 'a white crescent energy disc with a glowing blue cutting edge',
      },
    },
    {
      id: 'throw-snare',
      role: 'Throwable snare',
      looks: {
        FANTASY: 'a bundled rope net weighted with iron balls at its corners',
        AGE_OF_STEAM: 'a trio of brass bolas weights joined by braided cord',
        MODERN: 'a coiled steel cable snare with a spring catch',
        CYBERPUNK: 'a crackling cyan electro-net spreading from a black launcher shell',
        SPACE_OPERA: 'a white gravity-snare beacon trailing a violet tether field',
      },
    },
    {
      id: 'throw-decoy',
      role: 'Decoy throwable',
      looks: {
        FANTASY: 'a carved wooden rattle with a painted clay whistle in its handle',
        AGE_OF_STEAM: 'a brass clockwork noisemaker with a wind-up crank and a tiny bell',
        MODERN: 'a black remote noise beacon with a blinking red light',
        CYBERPUNK: 'a hologram projector puck throwing up a flickering cyan shimmer above its lens',
        SPACE_OPERA: 'a white sensor-ghost spike with a halo of false orange signal pulses',
      },
    },
    {
      id: 'throw-gas',
      role: 'Poison gas grenade',
      looks: {
        FANTASY: 'a cracked glass flask leaking sickly green mist',
        AGE_OF_STEAM: 'a riveted iron canister venting yellow-green vapour through a brass valve',
        MODERN: 'a blunt-nosed olive-drab gas shell trailing a pale yellow plume',
        CYBERPUNK:
          'a toxic-green finned nerve-gas bomblet with a hazard-striped nose and green vapour hissing from its fins',
        SPACE_OPERA: 'a white bio-agent canister with vents spilling glowing purple spores',
      },
    },
  ],
};
