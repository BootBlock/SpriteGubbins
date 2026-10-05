import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The quickhacks a netrunner uploads into a target’s implants: a short circuit, an overheat, a cryo
 * lock-up, a contagion, a synapse burnout, a weapon glitch, a crippled stride, a sonic shock, a system
 * collapse, a network ping and a memory wipe.
 *
 * **Eleven hacks across seven schools, told apart by silhouette.** Each is led by its own school’s
 * colour and no look names another school’s hue, but three schools hold two hacks apiece, so what keeps
 * them apart on an action bar is the object each is drawn as: a fused chip, a venting heat-sink, a
 * seized joint, a dissolving memory shard. Code is drawn as pixel blocks and shapes, never as characters.
 */
export const QUICKHACKS: IconCatalogueGroup = {
  id: 'quickhacks',
  label: 'Quickhacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'quickhack-short-circuit',
      role: 'Short circuit quickhack',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a cracked storm crystal with forked blue sparks leaping from its fracture',
        AGE_OF_STEAM: 'a brass fuse box blowing out in a shower of blue sparks',
        MODERN: 'a black circuit breaker tripping in a burst of blue sparks',
        CYBERPUNK:
          'a gunmetal implant chip with a blown blue fuse line and jagged blue arcs jumping between its pins',
        SPACE_OPERA: 'a white power coupling sparking with blue ion arcs',
      },
    },
    {
      id: 'quickhack-overheat',
      role: 'Overheat quickhack',
      school: 'THERMAL',
      looks: {
        FANTASY: 'a glowing iron brazier overflowing with orange flame',
        AGE_OF_STEAM: 'a brass boiler with its safety valve venting scalding orange steam',
        MODERN: 'a swollen black lithium battery smoking with orange heat',
        CYBERPUNK: 'a gunmetal heat-sink block with red-hot fins venting orange flames',
        SPACE_OPERA: 'a white reactor core cracking with orange plasma heat',
      },
    },
    {
      id: 'quickhack-cryo-lock',
      role: 'Cryo lock-up quickhack',
      school: 'CRYO',
      looks: {
        FANTASY: 'a sword encased in a block of cyan frost',
        AGE_OF_STEAM: 'a brass gear train locked in a crust of cyan rime',
        MODERN: 'a steel padlock iced over in cyan frost',
        CYBERPUNK: 'a gunmetal cyber-servo joint seized in a block of glowing cyan cryo crystals',
        SPACE_OPERA: 'a white stasis field cube with a teal cryonic glow',
      },
    },
    {
      id: 'quickhack-contagion',
      role: 'Contagion quickhack',
      school: 'TOXIC',
      looks: {
        FANTASY: 'a rotting green spore pod bursting into a cloud of spores',
        AGE_OF_STEAM: 'a brass miasma censer with green fumes curling out',
        MODERN: 'a black biohazard canister with green vapour leaking from its seal',
        CYBERPUNK:
          'a graphite virus capsule with green glitch tendrils jumping between three linked network nodes',
        SPACE_OPERA: 'a white biotoxin spore cluster drifting in a green haze',
      },
    },
    {
      id: 'quickhack-synapse-burnout',
      role: 'Synapse burnout quickhack',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a black candle burning down to its stub in a violet flame',
        AGE_OF_STEAM: 'a mesmerist’s brass spark coil scorching with violet arcs',
        MODERN: 'a scorched grey microchip smoking with violet sparks',
        CYBERPUNK:
          'a gunmetal neural-link jack with charred contacts and violet feedback crackling out of it',
        SPACE_OPERA: 'a white synaptic relay node fracturing with violet psionic light',
      },
    },
    {
      id: 'quickhack-weapon-glitch',
      role: 'Weapon glitch quickhack',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a crossbow jammed by a tangle of pink arcane threads',
        AGE_OF_STEAM: 'a brass flintlock pistol misfiring in a puff of pink aether',
        MODERN: 'a black rifle with a jammed bolt and a pink malware spark',
        CYBERPUNK: 'a gunmetal smart-gun with its barrel split by jagged pink glitch blocks',
        SPACE_OPERA: 'a white blaster rifle with a pink quantum fault flickering along its barrel',
      },
    },
    {
      id: 'quickhack-cripple-movement',
      role: 'Cripple movement quickhack',
      school: 'KINETIC',
      looks: {
        FANTASY: 'an iron ball and chain with a heavy shackle',
        AGE_OF_STEAM: 'a brass mantrap snapped shut on a riveted greave',
        MODERN: 'a cluster of steel caltrops with sharpened spikes',
        CYBERPUNK: 'a gunmetal leg-servo actuator snapped in two, its hydraulic piston bent and sparking',
        SPACE_OPERA: 'a white grav-anchor clamp pulling down with crushing gravity',
      },
    },
    {
      id: 'quickhack-sonic-shock',
      role: 'Sonic shock quickhack',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a storm war horn bellowing a blue thunderclap',
        AGE_OF_STEAM: 'a brass steam whistle shrieking out blue galvanic shock rings',
        MODERN: 'a black loudspeaker cone blasting a ring of blue sound waves',
        CYBERPUNK: 'a gunmetal audio-implant earpiece with jagged blue sonic rings bursting out of it',
        SPACE_OPERA: 'a white sonic emitter dish firing a blue resonance pulse',
      },
    },
    {
      id: 'quickhack-system-collapse',
      role: 'System collapse quickhack',
      school: 'NANITE',
      looks: {
        FANTASY: 'a stone tower crumbling under a beam of golden light',
        AGE_OF_STEAM: 'a brass difference engine collapsing in on itself in a gold flare',
        MODERN: 'a black server rack toppling over in a burst of yellow radiance',
        CYBERPUNK: 'a gunmetal cyberware core imploding into a swarm of golden nanite motes',
        SPACE_OPERA: 'a white space station ring collapsing into golden stellar fire',
      },
    },
    {
      id: 'quickhack-ping',
      role: 'Network ping quickhack',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a crystal scrying orb sending out pink arcane ripples',
        AGE_OF_STEAM: 'a brass telegraph key with pink aether pulses running along a copper wire',
        MODERN: 'a black wireless router with pink signal arcs',
        CYBERPUNK: 'a gunmetal relay node with pink pulse rings spreading out to three linked nodes',
        SPACE_OPERA: 'a white sensor buoy emitting a pink quantum sonar ripple',
      },
    },
    {
      id: 'quickhack-memory-wipe',
      role: 'Memory wipe quickhack',
      school: 'NEURAL',
      looks: {
        FANTASY: 'a glass memory phial draining into violet smoke',
        AGE_OF_STEAM: 'a brass mesmerist’s pocket pendulum swinging in a violet haze',
        MODERN: 'a black flash drive dissolving into violet pixel dust',
        CYBERPUNK: 'a gunmetal memory shard dissolving into violet static from one end',
        SPACE_OPERA: 'a white memory crystal fading into violet psionic mist',
      },
    },
  ],
};
