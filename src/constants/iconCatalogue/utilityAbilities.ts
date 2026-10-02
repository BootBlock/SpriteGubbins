import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The abilities that change how a character fights or moves through a place without striking anyone:
 * stealth, the auto-attack, a combat stance, a scan, a decoy and a hacked terminal.
 *
 * **The three toggles draw one object in both of its states,** so a player reads stealth, the
 * auto-attack and the stance as on or off by the change to a single silhouette. Stealth and the decoy
 * are neural, the shadow school, because both deceive the eye; the scan and the hack are netrun, the
 * arcane school, because both read and rewrite what a system knows; the auto-attack and the stance are
 * kinetic, the physical school of steel and weight.
 */
export const UTILITY_ABILITIES: IconCatalogueGroup = {
  id: 'utility-abilities',
  label: 'Utility abilities',
  kind: 'SPELL',
  entries: [
    {
      id: 'ability-stealth',
      role: 'Stealth',
      school: 'NEURAL',
      states: ['off', 'on'],
      looks: {
        FANTASY:
          'a hooded grey cloak hanging open, and drawn shut and fading into violet shadow for the second state',
        AGE_OF_STEAM:
          'a brass dark-lantern with its shutter open and lit, and shut with a violet shadow curling round it for the second state',
        MODERN:
          'a grey camouflage net bundled in a tight roll, and spread wide and fading into violet haze for the second state',
        CYBERPUNK:
          'a matte black thermoptic camo cowl lying fully opaque, and rippling into transparency with violet distortion along its seams for the second state',
        SPACE_OPERA:
          'a white cloaking-field generator lying dormant, and wrapped in a shimmering violet distortion bubble for the second state',
      },
    },
    {
      id: 'ability-auto-attack',
      role: 'Auto-attack',
      school: 'KINETIC',
      states: ['off', 'on'],
      looks: {
        FANTASY:
          'a steel sword sheathed in a leather scabbard, and drawn clear with a white glint along its edge for the second state',
        AGE_OF_STEAM:
          'a brass revolver holstered with its hammer down, and cocked with a puff of smoke at its muzzle for the second state',
        MODERN:
          'a black pistol with its safety on and its slide closed, and firing with a white muzzle flash for the second state',
        CYBERPUNK:
          'a chrome smart-gun slung low with its targeting link dark, and spitting a bright muzzle flash with its link lit for the second state',
        SPACE_OPERA:
          'a white blaster rifle with its power cell dim, and blazing a grey-white bolt for the second state',
      },
    },
    {
      id: 'ability-stance',
      role: 'Combat stance',
      school: 'KINETIC',
      states: ['assault', 'guard'],
      looks: {
        FANTASY:
          'a steel longsword angled point forward, and lowered behind a raised round shield for the second state',
        AGE_OF_STEAM:
          'a cavalry sabre levelled for a charge, and planted point down before a riveted iron buckler for the second state',
        MODERN:
          'a black assault rifle levelled forward, and a black ballistic shield braced upright for the second state',
        CYBERPUNK:
          'a chrome monoblade standing point forward with sparks along its edge, and sheathed behind a deployed hexagonal riot shield for the second state',
        SPACE_OPERA:
          'a white energy lance pointed forward, and a grey hexagonal barrier raised for the second state',
      },
    },
    {
      id: 'ability-scan',
      role: 'Scan and reveal',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a pink arcane scrying lens at the heart of a ring of arcane light',
        AGE_OF_STEAM: 'a brass direction-finding loop antenna pulsing rings of pink light',
        MODERN: 'a black thermal-imaging scope with a pink hotspot glowing on its lens',
        CYBERPUNK:
          'a chrome cyber-optic implant with a hot-pink iris aperture emitting a sweeping wireframe sonar ping',
        SPACE_OPERA: 'a white sensor drone casting a wide pink scanning cone',
      },
    },
    {
      id: 'ability-decoy',
      role: 'Decoy',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a silver mirror shard throwing three shimmering violet echoes of itself',
        AGE_OF_STEAM: 'a brass phantasmagoria lantern throwing a flickering violet shadow from its lens',
        MODERN: 'a black chaff canister bursting a cloud of violet foil strips',
        CYBERPUNK: 'a chrome hard-light decoy drone strobing a glitching violet holo-shell over itself',
        SPACE_OPERA: 'a white mirror-field pod scattering three violet phase-echo copies of itself',
      },
    },
    {
      id: 'ability-hack-terminal',
      role: 'Hack a terminal',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a carved stone lock-box split open by a glowing pink key sigil',
        AGE_OF_STEAM: 'a brass difference engine with a pink spark leaping between its exposed cogs',
        MODERN: 'a black flash drive plugged into a grey terminal port glowing pink',
        CYBERPUNK:
          'a coiled chrome jack cable spiked into a black terminal block, hot-pink intrusion sparks bursting from the port',
        SPACE_OPERA: 'a white console node with a pink holographic lock dissolving into pixels',
      },
    },
  ],
};
