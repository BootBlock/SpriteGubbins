import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The toxic school’s attacks: a direct hit, an area blast, a poison, a channelled spray, a finisher, a
 * corrosion mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is toxic, so the
 * prompt leads each with acid green and no look names another school’s hue. What keeps the seven apart
 * on an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a
 * round cloud for the blast, a drip for the poison, a straight stream for the channel, a heavy weapon
 * for the finisher, a corroded plate for the mark and the largest showpiece for the ultimate.
 */
export const TOXIC_ATTACKS: IconCatalogueGroup = {
  id: 'toxic-attacks',
  label: 'Toxic attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'toxic-strike',
      role: 'Toxic direct-hit attack',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a giant barbed thorn flying point-first, dripping green venom',
        AGE_OF_STEAM:
          'a stoppered glass phial of green vitriol tumbling through the air, its cork popping free',
        MODERN: 'a black pressurised sprayer wand squirting a single glob of green acid',
        CYBERPUNK: 'a chrome bio-weapon dart with a glowing green toxin vial in its tail fins',
        SPACE_OPERA: 'a white bio-dart pistol firing a glowing green alien spore',
      },
    },
    {
      id: 'toxic-blast',
      role: 'Toxic area blast',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a bursting green spore pod releasing a ring of toxic pollen',
        AGE_OF_STEAM: 'a brass mustard-gas bellows puffing out a ring of sickly green gas',
        MODERN: 'a grey nerve-gas canister bursting into a round green cloud',
        CYBERPUNK: 'a black gas drone with chrome rotors dumping a round corroding green chem cloud',
        SPACE_OPERA: 'a white bio-plague pod cracking open in a round burst of green alien spores',
      },
    },
    {
      id: 'toxic-over-time',
      role: 'Toxic damage over time',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a twisted thorny vine dripping thick green venom',
        AGE_OF_STEAM: 'a glass venom phial with a cracked neck oozing green droplets',
        MODERN: 'a pitted steel plate with green acid dripping down it and eating holes through',
        CYBERPUNK:
          'a nano-toxin vial in a chrome injector sleeve, a glowing green drop beading at its needle tip',
        SPACE_OPERA: 'a white hull plate pitted by a creeping green alien fungal bloom',
      },
    },
    {
      id: 'toxic-channel',
      role: 'Toxic channelled attack',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a dense stream of green venom-wasps flying in a tight straight line',
        AGE_OF_STEAM: 'a brass alchemical sprayer nozzle pouring a steady stream of green vitriol',
        MODERN: 'a black chemical sprayer wand pouring a steady straight stream of green acid',
        CYBERPUNK:
          'a chrome acid-spitter implant module with a flared nozzle, holding a steady jet of glowing green acid',
        SPACE_OPERA: 'a white bio-projector emitting a steady stream of glowing green spores',
      },
    },
    {
      id: 'toxic-finisher',
      role: 'Toxic finisher',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a huge bramble-wrapped war club smashing down in a burst of green thorns',
        AGE_OF_STEAM: 'a heavy brass alchemical mortar shell cracking open in a burst of green vitriol',
        MODERN: 'a black chemical grenade launcher firing one fat green-capped round',
        CYBERPUNK:
          'a hulking chrome toxin-injector spike with a glowing green payload chamber, plunging down in one blow',
        SPACE_OPERA: 'a white bio-lance with a glowing green plague core, thrust forward in one heavy strike',
      },
    },
    {
      id: 'toxic-vulnerability',
      role: 'Toxic vulnerability debuff',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a wooden shield eaten through by green rot, a thorny sigil marked at its centre',
        AGE_OF_STEAM: 'a brass armour plate etched and bubbling where green vitriol has splashed it',
        MODERN: 'a steel plate corroding under green acid foam with a crosshair marker over it',
        CYBERPUNK:
          'a chrome armour plate blistered by green chem corrosion, a glowing green bio-tag marker stuck to it',
        SPACE_OPERA: 'a white hull plate infected by spreading green alien spore veins',
      },
    },
    {
      id: 'toxic-ultimate',
      role: 'Toxic ultimate',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a colossal green carnivorous flytrap bloom with jaws of thorns',
        AGE_OF_STEAM: 'a towering brass alchemical still venting a roiling column of green gas',
        MODERN: 'a black chemical warhead with a hazard collar bursting into a green toxic mushroom cloud',
        CYBERPUNK:
          'a black chrome-ribbed gas drone mothership releasing a roiling green corrosive chem storm',
        SPACE_OPERA: 'a giant white bio-plague seed pod splitting open on a swirling green spore storm',
      },
    },
  ],
};
