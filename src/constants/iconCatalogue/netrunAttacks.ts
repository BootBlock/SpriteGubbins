import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The netrun school’s attacks: a direct hit, an area blast, a spreading corruption, a channelled
 * stream, a finisher, an exploit mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is netrun, so the
 * prompt leads each with hot pink and no look names another school’s hue. What keeps the seven apart
 * on an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring
 * for the blast, a leak or a creeping fracture for the corruption, a straight beam for the channel, a
 * heavy blow for the finisher, a breached object for the exploit and the largest showpiece for the
 * ultimate. Code is drawn as pixel blocks and shapes, never as characters.
 */
export const NETRUN_ATTACKS: IconCatalogueGroup = {
  id: 'netrun-attacks',
  label: 'Netrun attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'netrun-strike',
      role: 'Netrun direct-hit attack',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a glowing pink arcane missile trailing a wake of arcane sparks',
        AGE_OF_STEAM: 'a brass aether pistol with a crystal valve chamber firing a pink aetheric spark',
        MODERN: 'a black smartphone firing a jagged pink malware bolt of pixel blocks',
        CYBERPUNK: 'a jagged pink quickhack bolt of glitching pixel blocks, split like a forked arrow',
        SPACE_OPERA: 'a white entanglement pistol firing a twin-ghosted pink particle bolt',
      },
    },
    {
      id: 'netrun-blast',
      role: 'Netrun area blast',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a pink arcane circle of interlocking rings bursting outward in a ring of light',
        AGE_OF_STEAM:
          'a brass difference engine bursting in a ring of flying punch cards and pink aether sparks',
        MODERN: 'a black laptop at the centre of a ring of pink flood-attack packets bursting outward',
        CYBERPUNK:
          'a brushed-steel daemon orb detonating in a round pink glitch ring of shattered pixel blocks',
        SPACE_OPERA: 'a white wormhole micro-gate bursting outward in a round pink probability ripple',
      },
    },
    {
      id: 'netrun-over-time',
      role: 'Netrun damage over time',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a cracked crystal mana orb leaking pink arcane droplets',
        AGE_OF_STEAM: 'a cracked crystal aether valve in a brass collar, leaking pink aether droplets',
        MODERN: 'a black flash drive oozing a spreading pink virus blot of pixel blocks',
        CYBERPUNK:
          'a brushed-steel data shard crawling with pink glitch corruption, pixel blocks flaking off it',
        SPACE_OPERA:
          'a white quantum processor crystal riddled with slowly spreading pink decoherence fractures',
      },
    },
    {
      id: 'netrun-channel',
      role: 'Netrun channelled attack',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a floating faceted crystal pouring a steady pink arcane beam',
        AGE_OF_STEAM:
          'a brass aether-engine emitter firing a steady pink aether beam through a crystal valve',
        MODERN: 'a black wireless router pouring a steady pink stream of malware packets',
        CYBERPUNK:
          'a brushed-steel cyberdeck with a plugged interface cable, holding a steady pink data beam on its target',
        SPACE_OPERA: 'a white quantum-tether emitter holding a straight pink entanglement beam',
      },
    },
    {
      id: 'netrun-finisher',
      role: 'Netrun finisher',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a massive crystal warhammer swelling with pink mana as it smashes down',
        AGE_OF_STEAM: 'a heavy brass punch-card press stamping down in a burst of pink aether',
        MODERN: 'a black power-surge killer stick discharging a single pink overload pulse',
        CYBERPUNK:
          'a long brushed-steel daemon spike with a glitching pink crystal core, driving point-first in one blow',
        SPACE_OPERA:
          'a white quantum compressor clamp crushing a pink probability sphere down to a single point',
      },
    },
    {
      id: 'netrun-vulnerability',
      role: 'Netrun vulnerability debuff',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a cracked steel buckler with a glowing pink arcane ring branded on it',
        AGE_OF_STEAM: 'a riveted brass aether boiler split open, a pink spark leaking through the crack',
        MODERN: 'a broken black padlock with a pink backdoor keyhole glowing in it',
        CYBERPUNK: 'a brushed-steel hexagonal firewall panel with a pink glitch breach torn through its mesh',
        SPACE_OPERA: 'a white shield node with a pink wormhole micro-gate punched through it',
      },
    },
    {
      id: 'netrun-ultimate',
      role: 'Netrun ultimate',
      school: 'NETRUN',
      looks: {
        FANTASY: 'a vast pink arcane vortex swirling with orbiting rings of light',
        AGE_OF_STEAM: 'a towering brass aether turbine with its crystal valves blazing pink aether',
        MODERN: 'a black server rack with a pink worm of pixel coils spilling out of every port',
        CYBERPUNK:
          'a black-wall serpent of jagged pink pixel blocks coiling through a cracked brushed-steel ring',
        SPACE_OPERA: 'a white wormhole gate ring torn open on a swirling pink quantum rift',
      },
    },
  ],
};
