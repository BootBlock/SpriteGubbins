import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The neural school’s attacks: a direct hit, an area blast, a lingering corruption, a channelled
 * stream, a finisher, an exposure mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is neural, so the
 * prompt leads each with violet and no look names another school’s hue. What keeps the seven apart on
 * an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring
 * for the blast, an oozing stain for the corruption, a straight stream for the channel, a heavy blow
 * for the finisher, a marked object for the exposure and the largest showpiece for the ultimate.
 */
export const NEURAL_ATTACKS: IconCatalogueGroup = {
  id: 'neural-attacks',
  label: 'Neural attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'neural-strike',
      role: 'Neural direct-hit attack',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a jagged bolt of violet shadow trailing dark wisps',
        AGE_OF_STEAM: 'a brass mesmerist’s pendulum loosing a single violet spiral pulse',
        MODERN: 'a jagged violet psychic spike piercing a grey brainwave trace',
        CYBERPUNK:
          'a chrome neural spike chip jamming into a sparking neural-link jack in a burst of violet feedback',
        SPACE_OPERA: 'a narrow white psionic dart of violet light',
      },
    },
    {
      id: 'neural-blast',
      role: 'Neural area blast',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a ring of dark violet shadow bursting outward from a black void orb',
        AGE_OF_STEAM: 'a brass séance bell ringing out a ring of violet ectoplasm',
        MODERN: 'a black speaker cone emitting a round violet psychic shockwave',
        CYBERPUNK: 'a chrome neuro-pulse grenade bursting in a round violet feedback ring',
        SPACE_OPERA: 'a white psionic amplifier sphere releasing a round violet telepathic shockwave',
      },
    },
    {
      id: 'neural-over-time',
      role: 'Neural damage over time',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a cracked black curse amulet dripping violet shadow',
        AGE_OF_STEAM: 'a brass-mounted spirit-photography plate oozing violet ectoplasm from its glass',
        MODERN: 'a grey brainwave trace blotted by a spreading violet migraine stain',
        CYBERPUNK: 'a cracked chrome wetware chip smoking and spitting violet sparks of slow synapse burn',
        SPACE_OPERA: 'a white neural-dampener crystal clouding with slowly spreading violet psionic fog',
      },
    },
    {
      id: 'neural-channel',
      role: 'Neural channelled attack',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a pair of dark violet shadow tendrils streaming straight out of a black orb',
        AGE_OF_STEAM: 'a brass séance trumpet pouring a steady stream of violet ectoplasm',
        MODERN: 'a black transmitter dish holding a steady violet psychic wave',
        CYBERPUNK:
          'a coiled chrome mind-hack cable plugged into a wetware port, a steady violet pulse racing along it',
        SPACE_OPERA: 'a white psionic lance emitter firing a straight violet psionic beam',
      },
    },
    {
      id: 'neural-finisher',
      role: 'Neural finisher',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a huge black scythe sweeping down in an arc of violet shadow',
        AGE_OF_STEAM: 'a brass-bound mesmeric orb slammed down and splitting in a violet spiral flash',
        MODERN: 'a black hypnotist’s pendulum crystal shattering in a single violet psychic flash',
        CYBERPUNK: 'a chrome synapse-burn spike gun firing a single overloaded violet neural round',
        SPACE_OPERA: 'a white psionic crusher ring clamping shut round a crushed violet orb',
      },
    },
    {
      id: 'neural-vulnerability',
      role: 'Neural vulnerability debuff',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a dark violet curse sigil glowing on a black stone slab',
        AGE_OF_STEAM: 'a brass hypnosis disc spinning a violet spiral on its polished front',
        MODERN: 'a grey sensor-pad headset with a pulsing violet target ring over its sensor',
        CYBERPUNK: 'a black braindance headset rig with a blinking violet tracking bug clamped to its band',
        SPACE_OPERA: 'a white mind-shield halo cracking under a glowing violet psionic sigil',
      },
    },
    {
      id: 'neural-ultimate',
      role: 'Neural ultimate',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a swirling violet void rift with dark tendrils reaching out of it',
        AGE_OF_STEAM: 'a towering brass mesmerism engine spinning a vast violet hypnotic spiral',
        MODERN: 'a black satellite dish blasting a vast storm of crackling violet psychic waves',
        CYBERPUNK:
          'a towering black chrome-ribbed broadcast mast unleashing a roaring violet neural overload storm',
        SPACE_OPERA: 'a white psionic monolith radiating a vast violet telepathic shockwave',
      },
    },
  ],
};
