import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The class badges a squad frame and a lobby show beside each player: assault, recon, support, medic,
 * engineer, marksman, heavy, netrunner and commander.
 *
 * **Each badge is one object a role carries, never the person carrying it,** and each is a different
 * object with a different outline, so a player still tells the roles apart at 20 px once the engine has
 * greyed the badge to a tint mask in their team’s colour. The commander’s badge is a standard or a baton
 * rather than a crown, which is the group leader’s.
 */
export const SQUAD_ROLES: IconCatalogueGroup = {
  id: 'squad-roles',
  label: 'Squad roles',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'role-assault',
      role: 'Assault role',
      looks: {
        FANTASY: 'a broad iron spearhead with a red tassel tied below its socket',
        AGE_OF_STEAM: 'a long brass bayonet with a riveted socket',
        MODERN: 'a bold red arrowhead with a notched base',
        CYBERPUNK: 'a gunmetal spearhead blade with a neon-red edge glow and sparks at its point',
        SPACE_OPERA: 'a white delta-wing dart with a red plasma trail',
      },
    },
    {
      id: 'role-recon',
      role: 'Recon role',
      looks: {
        FANTASY: 'a leather-wrapped spyglass with brass end caps',
        AGE_OF_STEAM: 'a brass naval periscope with a riveted bend and a round lens',
        MODERN: 'a pair of black binoculars with green lens caps',
        CYBERPUNK: 'a matte black quadrotor drone with a glowing cyan sensor lens',
        SPACE_OPERA: 'a white sensor probe with a ring of blue scanning light',
      },
    },
    {
      id: 'role-support',
      role: 'Support role',
      looks: {
        FANTASY: 'a full leather quiver of arrows with a buckled strap',
        AGE_OF_STEAM: 'a wooden powder keg banded in brass',
        MODERN: 'an olive ammunition box with a hinged lid and a carry handle',
        CYBERPUNK: 'a gunmetal ammo drum with a glowing amber feed light',
        SPACE_OPERA: 'a white power-cell pack with blue charge rings',
      },
    },
    {
      id: 'role-medic',
      role: 'Medic role',
      looks: {
        FANTASY: 'a red cross stitched on a round linen patch',
        AGE_OF_STEAM: 'a leather doctor’s bag with brass clasps and a red cross',
        MODERN: 'a red cross on a white circle',
        CYBERPUNK: 'a glowing neon-green cross on a gunmetal hexagon',
        SPACE_OPERA: 'a white medi-drone with a red cross of light on its hull',
      },
    },
    {
      id: 'role-engineer',
      role: 'Engineer role',
      looks: {
        FANTASY: 'a smith’s hammer crossed over a pair of iron tongs',
        AGE_OF_STEAM: 'a large brass spanner with an adjustable jaw',
        MODERN: 'a yellow adjustable wrench crossed with a screwdriver',
        CYBERPUNK: 'a gunmetal multi-tool wrench with a glowing orange arc at its tip',
        SPACE_OPERA: 'a white hydrospanner with a blue energy tip',
      },
    },
    {
      id: 'role-marksman',
      role: 'Marksman role',
      looks: {
        FANTASY: 'a round straw archery target with one arrow in its centre',
        AGE_OF_STEAM: 'a long brass rifle telescope with a leather sunshade',
        MODERN: 'a black crosshair reticle in a thin circle',
        CYBERPUNK: 'a neon-red crosshair reticle hovering over a gunmetal scope lens',
        SPACE_OPERA: 'a blue targeting reticle of light around a white pinpoint',
      },
    },
    {
      id: 'role-heavy',
      role: 'Heavy role',
      looks: {
        FANTASY: 'a heavy iron tower shield studded with rivets',
        AGE_OF_STEAM: 'a riveted iron boiler-plate shield with a brass boss',
        MODERN: 'a black riot shield with a small viewing window',
        CYBERPUNK: 'a hulking gunmetal shield with hazard stripes and glowing orange vents',
        SPACE_OPERA: 'a white hexagonal energy barrier with a blue glow',
      },
    },
    {
      id: 'role-netrunner',
      role: 'Netrunner role',
      looks: {
        FANTASY: 'a crystal scrying orb on a twisted iron stand',
        AGE_OF_STEAM: 'a brass telegraph key with a coil of copper wire',
        MODERN: 'a black network plug with a coiled cable',
        CYBERPUNK: 'a gunmetal neural jack plug trailing a glowing cyan data cable',
        SPACE_OPERA: 'a white data crystal with a lattice of blue light inside',
      },
    },
    {
      id: 'role-commander',
      role: 'Commander role',
      looks: {
        FANTASY: 'a red war banner on a tall pole with a gold finial',
        AGE_OF_STEAM: 'a field marshal’s baton tipped in brass',
        MODERN: 'a black field radio with a whip antenna',
        CYBERPUNK: 'a gunmetal command beacon with a rotating amber hologram cone',
        SPACE_OPERA: 'a white signal pylon with a blue command light at its tip',
      },
    },
  ],
};
