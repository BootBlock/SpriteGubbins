import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The abilities a support spends on the rest of the party: heals for one ally and for many, a shield,
 * a cleanse, a revive, an empowerment, haste and a cut to the damage taken.
 *
 * **Each one is the effect, never the item that delivers it.** The restoratives shelf already holds
 * the injector, the potion and the defibrillator, so an ability is drawn as a beam, a sigil, a drone
 * or an implant at work. The heals, the cleanse and the revive are nanite, the holy school; the
 * shield and haste are voltaic, which carries the storm’s charge and speed; the empowerment is
 * netrun, the arcane school; and the damage reduction is kinetic, because it is plate and nothing
 * else.
 */
export const SUPPORT_ABILITIES: IconCatalogueGroup = {
  id: 'support-abilities',
  label: 'Support abilities',
  kind: 'SPELL',
  entries: [
    {
      id: 'ability-heal-target',
      role: 'Single-target heal',
      school: 'NANITE',
      looks: {
        FANTASY: 'a single beam of golden holy light descending onto a radiant cross sigil',
        AGE_OF_STEAM: 'a brass-and-glass radiance lamp focusing one golden healing ray through a lens',
        MODERN: 'a white medical cross glowing gold at the centre of a targeting crosshair',
        CYBERPUNK:
          'a chrome medic drone hovering on twin rotors, spraying a tight beam of glittering golden nanite mist',
        SPACE_OPERA: 'a white bio-regeneration orb firing a gold cross of light into a targeting ring',
      },
    },
    {
      id: 'ability-heal-area',
      role: 'Area heal',
      school: 'NANITE',
      looks: {
        FANTASY: 'a golden holy circle of light radiating three widening rings',
        AGE_OF_STEAM: 'a brass aether fountain spraying a wide ring of golden healing mist',
        MODERN: 'a white aerosol fogger venting a broad cloud of shimmering gold vapour',
        CYBERPUNK:
          'a chrome nanite-dispersal pylon venting a ring-shaped golden cloud of glittering repair nanites',
        SPACE_OPERA: 'a white healing-field beacon spreading a wide gold dome of light',
      },
    },
    {
      id: 'ability-shield',
      role: 'Damage-absorbing shield',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a silver kite shield wrapped in a crackling blue ward bubble',
        AGE_OF_STEAM: 'a brass galvanic aegis disc ringed with copper coils and a crackling blue field',
        MODERN: 'a clear polycarbonate riot shield with a crackling blue charge along its rim',
        CYBERPUNK:
          'a chrome deflector-node implant projecting a hexagonal electric-blue hard-light barrier, sparks bursting where it takes a hit',
        SPACE_OPERA: 'a white emitter disc projecting a blue hexagonal deflector bubble',
      },
    },
    {
      id: 'ability-cleanse',
      role: 'Cleanse',
      school: 'NANITE',
      looks: {
        FANTASY: 'a golden chalice pouring a stream of purifying light over a curl of black taint',
        AGE_OF_STEAM: 'a brass sterilising lamp casting a gold beam that burns away a wisp of black soot',
        MODERN: 'a gold-glowing soap bubble with a black speck dissolving inside it',
        CYBERPUNK:
          'a golden swarm of scrubber nanites pouring from a chrome injector nozzle and dissolving a black clot of malware sludge',
        SPACE_OPERA: 'a white purification ring sweeping a gold scanning plane through a dark cloud',
      },
    },
    {
      id: 'ability-revive-ally',
      role: 'Revive an ally',
      school: 'NANITE',
      looks: {
        FANTASY: 'a golden phoenix sigil rising in flame from a small heap of ash',
        AGE_OF_STEAM: 'a brass clockwork heart restarting, its pistons pumping out golden sparks',
        MODERN: 'a golden heart-rate trace leaping back up from a flat line on a black monitor',
        CYBERPUNK: 'a cracked chrome cortex-backup shard flaring a rising golden soul-flame',
        SPACE_OPERA: 'a white nanite reconstruction ring weaving a golden heart from streams of light',
      },
    },
    {
      id: 'ability-empower-ally',
      role: 'Ally empowerment buff',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a pink arcane sigil of an upraised sword ringed by ascending sparks',
        AGE_OF_STEAM: 'a brass overcharge capacitor with a pink spark climbing a riveted lightning rod',
        MODERN: 'a pink double-chevron rank insignia patch on black hook-and-loop backing',
        CYBERPUNK:
          'a chrome overclock chip with hot-pink circuit traces flaring upward through three stacked chevrons',
        SPACE_OPERA: 'a white command relay beacon beaming a rising pink arrowhead of light',
      },
    },
    {
      id: 'ability-haste',
      role: 'Haste',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a spiralling blue storm vortex flanked by a pair of swept falcon wings',
        AGE_OF_STEAM: 'a brass governor flywheel spinning hard with blue galvanic sparks',
        MODERN: 'a black turbocharger with blue current arcing round its spinning impeller',
        CYBERPUNK:
          'a ribbed chrome reflex-booster implant module with electric-blue current arcing between its contact rings and a smear of blue afterimages trailing it',
        SPACE_OPERA: 'a white overdrive thruster ring flaring electric-blue plasma',
      },
    },
    {
      id: 'ability-damage-reduction',
      role: 'Damage reduction',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a riveted steel breastplate, dented and glinting white along its edges',
        AGE_OF_STEAM: 'a brass-riveted iron cuirass of layered overlapping plates',
        MODERN: 'a black ballistic vest with a dented steel trauma plate',
        CYBERPUNK:
          'a sheet of chrome subdermal plating with a flattened slug embedded in it and steel sparks spitting from the dent',
        SPACE_OPERA: 'a white ablative armour plate rippling with a grey glowing impact ring',
      },
    },
  ],
};
