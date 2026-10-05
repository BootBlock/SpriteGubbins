import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The thermal school’s attacks: a direct hit, an area blast, a burn, a channelled jet, a finisher, a
 * heat-weakening mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is thermal, so the
 * prompt leads each with orange and no look names another school’s hue. What keeps the seven apart on
 * an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring
 * for the blast, dripping fire for the burn, a straight jet for the channel, a heavy weapon for the
 * finisher, a marked plate for the weakness and the largest showpiece for the ultimate.
 */
export const THERMAL_ATTACKS: IconCatalogueGroup = {
  id: 'thermal-attacks',
  label: 'Thermal attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'thermal-strike',
      role: 'Thermal direct-hit attack',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a blazing orange fireball with a long trailing tail of flame',
        AGE_OF_STEAM: 'a brass flare pistol firing a red-hot coal shot trailing orange sparks',
        MODERN: 'a black flare gun firing a red signal flare round in a streak of smoke',
        CYBERPUNK: 'a brushed-steel flamethrower nozzle spitting a short tongue of orange-hot plasma',
        SPACE_OPERA: 'a white plasma pistol firing an elongated orange plasma bolt',
      },
    },
    {
      id: 'thermal-blast',
      role: 'Thermal area blast',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a ring of orange flame bursting outward from a blazing orange fire core',
        AGE_OF_STEAM: 'a burst brass boiler drum blowing out in a ring of orange fire and scalding steam',
        MODERN: 'a black napalm canister bursting into a wide orange fireball with black smoke curling up',
        CYBERPUNK:
          'a brushed-steel thermite charge with a blinking red diode blowing out in a searing ring of molten orange slag',
        SPACE_OPERA: 'a white flare emitter releasing a round orange plasma nova',
      },
    },
    {
      id: 'thermal-over-time',
      role: 'Thermal damage over time',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a ball of burning pitch dripping slow gobbets of orange flame',
        AGE_OF_STEAM: 'a glowing red-hot coal held in brass tongs, orange embers drifting off it',
        MODERN: 'a dripping glob of burning napalm gel trailing orange fire',
        CYBERPUNK:
          'a cracked brushed-steel incendiary canister leaking a slow drip of burning orange plasma gel',
        SPACE_OPERA: 'a white hull plate with a glowing orange plasma scorch spreading across it',
      },
    },
    {
      id: 'thermal-channel',
      role: 'Thermal channelled attack',
      school: 'THERMAL',
      looks: {
        FANTASY: 'an iron-shod wizard’s staff pouring a steady stream of orange fire',
        AGE_OF_STEAM: 'a brass coal-fired bellows nozzle pouring a straight jet of orange fire',
        MODERN: 'a black military flamethrower nozzle spewing a long straight jet of orange flame',
        CYBERPUNK:
          'a brushed-steel plasma cutter torch holding a needle-thin orange plasma beam, molten sparks spraying off its tip',
        SPACE_OPERA: 'a sleek white plasma lance projector firing a straight beam of searing orange plasma',
      },
    },
    {
      id: 'thermal-finisher',
      role: 'Thermal finisher',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a huge flaming warhammer smashing down in a burst of orange embers',
        AGE_OF_STEAM:
          'a massive red-hot forge hammer slamming down on an iron anvil in a spray of orange sparks',
        MODERN: 'a heavy black thermite shell bursting white-hot in a shower of molten orange sparks',
        CYBERPUNK:
          'an overclocked brushed-steel plasma maul with red-hot heat-sink fins round its striking end, venting orange plasma as it swings down',
        SPACE_OPERA:
          'a white plasma warhammer with a molten orange core, swung down in an arc of searing plasma',
      },
    },
    {
      id: 'thermal-vulnerability',
      role: 'Thermal vulnerability debuff',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a charred wooden shield with a glowing orange flame mark burnt into its centre',
        AGE_OF_STEAM: 'a brass boiler plate bulging red-hot, orange steam hissing from a split seam',
        MODERN: 'a scorched steel plate with an orange heat-tint ring and a red laser dot at its centre',
        CYBERPUNK:
          'a brushed-steel armour plate glowing red-hot under an orange thermal-targeting reticle, its edges warping',
        SPACE_OPERA: 'a white energy-shield dome with a glowing orange breach melted through its crown',
      },
    },
    {
      id: 'thermal-ultimate',
      role: 'Thermal ultimate',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a blazing orange phoenix with wings of flame spread wide',
        AGE_OF_STEAM:
          'a towering brass furnace engine with its firebox thrown open on a roaring blast of orange flame',
        MODERN: 'a black incendiary cluster bomb splitting into a fan of burning orange bomblets',
        CYBERPUNK:
          'a hulking brushed-steel plasma-cannon rig with red-hot heat-sink fins, unleashing a roaring orange plasma torrent',
        SPACE_OPERA: 'a white capital-ship plasma cannon erupting with a vast orange plasma torrent',
      },
    },
  ],
};
