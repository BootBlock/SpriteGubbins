import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The marks a killfeed and a scoreboard draw beside a player’s name: an elimination and how it was
 * made, an assist, a player downed and revived, a self-elimination and a team kill, a streak, the
 * match’s most valuable player, and the quality of a player’s connection.
 *
 * **Each mark is told apart by its outline alone,** because a killfeed shows it at about 16 px and
 * often as a grey tint mask coloured by team. So no two share an object in one world. A streak is a
 * row of shapes rather than a count, a precision shot is a pierced target or a sight rather than
 * anything anatomical, and an elimination is a struck-out mark rather than a body.
 */
export const KILLFEED: IconCatalogueGroup = {
  id: 'killfeed',
  label: 'Killfeed and scoreboard',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'feed-elimination',
      role: 'Elimination',
      looks: {
        FANTASY: 'a snapped wooden spear with its iron point broken away',
        AGE_OF_STEAM: 'a pair of crossed duelling pistols over a black cross',
        MODERN: 'a bold black cross mark over a hollow circle',
        CYBERPUNK: 'a neon-red crosshair reticle struck through by a jagged slash, glitching over gunmetal',
        SPACE_OPERA: 'a red targeting reticle collapsing into a burst of blue sparks',
      },
    },
    {
      id: 'feed-precision-shot',
      role: 'Precision shot',
      looks: {
        FANTASY: 'a black-fletched arrow buried in the gold centre of a round target',
        AGE_OF_STEAM: 'a long brass telescopic rifle sight with a fine crosshair',
        MODERN: 'a bullseye target with a single hole dead centre',
        CYBERPUNK: 'a gunmetal sniper scope with a neon-red pinpoint dot glowing at its lens',
        SPACE_OPERA: 'a white bullseye of concentric rings pierced by a thin blue beam',
      },
    },
    {
      id: 'feed-assist',
      role: 'Assist',
      looks: {
        FANTASY: 'a pair of linked iron rings',
        AGE_OF_STEAM: 'a pair of meshing brass cogs',
        MODERN: 'a pair of overlapping rings with a small plus between them',
        CYBERPUNK: 'a pair of interlocked gunmetal hex nodes joined by a neon-cyan data link',
        SPACE_OPERA: 'a pair of white twin moons linked by a bridge of blue light',
      },
    },
    {
      id: 'feed-downed',
      role: 'Downed',
      looks: {
        FANTASY: 'a fallen iron helm lying on its side with a dent in its crown',
        AGE_OF_STEAM: 'a dented brass pith helmet tipped on its side',
        MODERN: 'a cracked combat helmet tipped on its side',
        CYBERPUNK: 'a cracked gunmetal tactical helmet with a flickering neon-amber visor light',
        SPACE_OPERA: 'a white armoured helmet with a cracked visor glowing amber',
      },
    },
    {
      id: 'feed-revived',
      role: 'Revived',
      looks: {
        FANTASY: 'a phoenix feather glowing with golden light',
        AGE_OF_STEAM: 'a brass galvanic battery with a pair of crackling copper paddles',
        MODERN: 'a pair of defibrillator paddles with a spark leaping between them',
        CYBERPUNK: 'a gunmetal defibrillator puck crackling with arcs of neon-green current',
        SPACE_OPERA: 'a white regeneration halo of rising blue light',
      },
    },
    {
      id: 'feed-self-elimination',
      role: 'Self-elimination',
      looks: {
        FANTASY: 'a curved wooden boomerang',
        AGE_OF_STEAM: 'a brass cannon with its barrel split open by its own blast',
        MODERN: 'a circular arrow curling back on itself into a broken loop',
        CYBERPUNK: 'a looping neon-orange arrow that turns back into its own tail, glitching over carbon',
        SPACE_OPERA: 'a white looped comet trail curving back into its own blue source',
      },
    },
    {
      id: 'feed-team-kill',
      role: 'Team kill',
      looks: {
        FANTASY: 'a cracked blue shield split by its own sword',
        AGE_OF_STEAM: 'a snapped brass chain with its broken link dangling',
        MODERN: 'a blue shield cracked down the middle',
        CYBERPUNK: 'a neon-blue shield emblem shattering into glitching gunmetal shards',
        SPACE_OPERA: 'a blue friendly-contact diamond cracked into two halves',
      },
    },
    {
      id: 'feed-multi-kill',
      role: 'Multi-kill streak',
      looks: {
        FANTASY: 'a trio of notched iron daggers fanned out',
        AGE_OF_STEAM: 'a row of three brass cartridge casings with a curl of smoke',
        MODERN: 'a stack of three bold upward chevrons',
        CYBERPUNK: 'a stack of three neon-orange upward chevrons with a flame trail',
        SPACE_OPERA: 'a cluster of three red stars in a tight arc',
      },
    },
    {
      id: 'feed-most-valuable-player',
      role: 'Match most valuable player',
      looks: {
        FANTASY: 'a gold victor’s goblet with a ruby set in its bowl',
        AGE_OF_STEAM: 'a brass trophy cup with twin handles',
        MODERN: 'a gold five-pointed star with a ribbon tail',
        CYBERPUNK: 'a gunmetal trophy pillar topped with a neon-gold star',
        SPACE_OPERA: 'a white laurel wreath of light around a gold core',
      },
    },
    {
      id: 'feed-melee',
      role: 'Melee elimination',
      looks: {
        FANTASY: 'a straight iron sword with a leather grip',
        AGE_OF_STEAM: 'a curved cavalry sabre with a brass knuckle guard',
        MODERN: 'a combat knife with a serrated spine',
        CYBERPUNK: 'a gunmetal mono-katana with a glowing neon-red edge',
        SPACE_OPERA: 'a white energy blade with a humming blue edge',
      },
    },
    {
      id: 'feed-explosive',
      role: 'Explosive elimination',
      looks: {
        FANTASY: 'a burst of orange alchemical fire from a cracked clay pot',
        AGE_OF_STEAM: 'a black iron grenade with a lit fuse',
        MODERN: 'a jagged orange starburst explosion with flying debris',
        CYBERPUNK: 'a jagged neon-orange starburst blast with gunmetal shrapnel',
        SPACE_OPERA: 'a white plasma shockwave ring bursting with orange light',
      },
    },
    {
      id: 'feed-connection',
      role: 'Connection quality',
      looks: {
        FANTASY: 'a set of four ascending crystal shards glowing blue',
        AGE_OF_STEAM: 'a brass telegraph mast throwing off arcs of blue spark',
        MODERN: 'a set of four ascending signal bars',
        CYBERPUNK: 'a set of four rising neon-green signal bars over a gunmetal antenna base',
        SPACE_OPERA: 'a white antenna dish sending arcs of blue light',
      },
    },
  ],
};
