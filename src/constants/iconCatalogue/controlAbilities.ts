import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The abilities that take control of an enemy: a stun, a root, a slow, an interrupt, a knockback, a
 * fear and a taunt.
 *
 * **Each control effect takes the school whose fantasy equivalent does that job.** A stun is storm, so
 * voltaic; a root is nature, so toxic; a slow is frost, so cryo; a fear is shadow, so neural; and an
 * interrupt is arcane, so netrun. The knockback and the taunt are kinetic, the physical school, because
 * a shove and a challenge are both done with weight and steel. None is the grenade or the snare the
 * throwables shelf carries: each is the strike, the trap or the signal itself.
 */
export const CONTROL_ABILITIES: IconCatalogueGroup = {
  id: 'control-abilities',
  label: 'Control abilities',
  kind: 'SPELL',
  entries: [
    {
      id: 'ability-stun',
      role: 'Stun',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a forked bolt of blue lightning striking a dented iron helm, a ring of stars circling it',
        AGE_OF_STEAM: 'a pair of galvanic copper prongs with a crackling blue arc leaping between them',
        MODERN: 'a black taser with two barbed probes trailing coiled wires and a crackling blue arc',
        CYBERPUNK:
          'a chrome stun-prod baton jamming electric-blue current into a sparking cyberware jack, its circuits frying',
        SPACE_OPERA: 'a white stun-ring emitter discharging a halo of electric-blue rings',
      },
    },
    {
      id: 'ability-root',
      role: 'Root in place',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a coil of thorned green vines lashing tight round an iron boot',
        AGE_OF_STEAM: 'a riveted iron mantrap clamped shut, green verdigris crusting its jaws',
        MODERN: 'a tactical boot sunk in a mound of hardened green adhesive foam',
        CYBERPUNK:
          'a black mag-boot welded to a deck grate by spreading acid-green bio-resin tendrils glowing through their cracks',
        SPACE_OPERA: 'a white grav-lock spike throwing a ring of green gravity coils',
      },
    },
    {
      id: 'ability-slow',
      role: 'Slow',
      school: 'CRYO',
      looks: {
        FANTASY: 'an hourglass rimed in frost, its sand trickling as cyan ice crystals',
        AGE_OF_STEAM: 'a brass clockwork escapement frozen mid-swing, its pendulum furred with cyan frost',
        MODERN: 'a black stopwatch with its glass iced over and a cyan frost crack across its dial',
        CYBERPUNK:
          'a chrome servo-joint actuator seized solid under a crust of cyan cryo-coolant, frost venting from a burst hydraulic line',
        SPACE_OPERA: 'a white stasis-field disc caught in a slowing spiral of cyan ice shards',
      },
    },
    {
      id: 'ability-interrupt',
      role: 'Interrupt',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a pink arcane sigil cracked in two by a silver dagger',
        AGE_OF_STEAM: 'a brass telegraph key with its wire snipped and a pink spark leaping from the cut',
        MODERN: 'a black radio jammer with three stubby antennae throwing out a pink burst of interference',
        CYBERPUNK:
          'a chrome kill-switch spike jammed into a cyberdeck port, hot-pink feedback cracking its display into glitching shards',
        SPACE_OPERA: 'a white signal-cutter drone slicing a hot-pink comm beam in two',
      },
    },
    {
      id: 'ability-knockback',
      role: 'Knockback',
      school: 'KINETIC',
      looks: {
        FANTASY: 'an iron war maul with a white shockwave ring bursting from its striking end',
        AGE_OF_STEAM: 'a piston-driven brass battering ram slamming forward in a burst of steam',
        MODERN: 'a black steel breaching ram slamming forward with white impact rings',
        CYBERPUNK:
          'a chrome hydraulic impact-ram implant punching forward in a burst of white sparks and a concussive shock ring',
        SPACE_OPERA: 'a white force-push emitter blasting a cone of rippling grey gravitic waves',
      },
    },
    {
      id: 'ability-fear',
      role: 'Fear',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a jagged violet shadow rune with black tendrils of dread dripping from it',
        AGE_OF_STEAM: 'a brass mesmeric lamp casting a spinning violet spiral of dread',
        MODERN: 'a black acoustic deterrent dish firing jagged violet shock rings',
        CYBERPUNK:
          'a chrome neuro-jammer dart lodged in a cracked neural-link socket, violet panic glitches spidering out of it in jagged shards',
        SPACE_OPERA: 'a white psi-disruptor orb splitting the dark with jagged violet terror arcs',
      },
    },
    {
      id: 'ability-taunt',
      role: 'Taunt',
      school: 'KINETIC',
      looks: {
        FANTASY:
          'a dented iron round shield struck by a sword pommel, white shock rings bursting from its boss',
        AGE_OF_STEAM: 'a brass ship’s bell struck hard, rippling white sound rings',
        MODERN: 'a black megaphone blaring jagged white sound rings',
        CYBERPUNK: 'a chrome aggro-beacon pylon blasting a white strobe and a ring of target-lock chevrons',
        SPACE_OPERA: 'a white provocation beacon projecting a rotating target-lock reticle of grey light',
      },
    },
  ],
};
