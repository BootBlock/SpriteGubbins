import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The buttons of a pet bar: the three orders a pet takes, and the three stances it holds between them.
 *
 * **Every command is a glyph a pet bar reads at a glance, not a picture of the pet obeying it.** The
 * orders share a paw print and change only what goes with it, a blade, a trail or a ring, and the
 * stances read as standing down, guarding and baring teeth, so each sits beside the others without a
 * reader mistaking one for another.
 */
export const PET_COMMANDS: IconCatalogueGroup = {
  id: 'pet-commands',
  label: 'Pet commands',
  kind: 'COMPANION',
  entries: [
    {
      id: 'pet-attack',
      role: 'Pet attack command',
      looks: {
        FANTASY: 'a carved paw print crossed by a steel sword',
        AGE_OF_STEAM: 'a brass paw-print medallion crossed by a riveted cavalry sabre',
        MODERN: 'a black paw print crossed by a matte-black combat knife',
        CYBERPUNK:
          'a neon-red paw print crossed by a brushed-steel mantis-blade, a burst of steel sparks where they meet',
        SPACE_OPERA: 'a white paw print crossed by a glowing blue energy blade',
      },
    },
    {
      id: 'pet-follow',
      role: 'Pet follow command',
      looks: {
        FANTASY: 'a paw print leading a curving trail of three smaller paw prints',
        AGE_OF_STEAM: 'a brass paw-print token trailing a short length of copper chain',
        MODERN: 'a black paw print beside a looped red leash',
        CYBERPUNK: 'a neon-cyan paw print trailing a dotted path of glowing waypoint chevrons',
        SPACE_OPERA: 'a white paw print followed by a curving line of pale-blue light dots',
      },
    },
    {
      id: 'pet-stay',
      role: 'Pet stay command',
      looks: {
        FANTASY: 'a paw print planted inside a carved stone ring',
        AGE_OF_STEAM: 'a brass paw print bolted inside a riveted iron ring',
        MODERN: 'a black paw print inside a solid grey circle',
        CYBERPUNK: 'a brushed-steel paw print locked inside a glowing amber geofence ring',
        SPACE_OPERA: 'a white paw print held in a ring of blue stasis light',
      },
    },
    {
      id: 'pet-passive',
      role: 'Pet passive stance',
      looks: {
        FANTASY: 'a white banner hanging limp from a lowered spear',
        AGE_OF_STEAM: 'a furled white flag on a brass pole tilted low',
        MODERN: 'a small white flag on a short pole, lowered at an angle',
        CYBERPUNK:
          'a brushed-steel toggle switch thrown down, a dim grey paw print on its plate and one cold standby diode',
        SPACE_OPERA: 'a white paw print inside a dimmed pale-blue standby ring',
      },
    },
    {
      id: 'pet-defensive',
      role: 'Pet defensive stance',
      looks: {
        FANTASY: 'a round wooden shield with an iron boss and a paw print painted on it',
        AGE_OF_STEAM: 'a riveted brass shield with a paw print embossed at its centre',
        MODERN: 'a black riot shield with a white paw print decal',
        CYBERPUNK: 'a hexagonal shield of glowing cyan force-field panels round a brushed-steel paw print',
        SPACE_OPERA: 'a white energy-barrier dome with a blue paw print at its centre',
      },
    },
    {
      id: 'pet-aggressive',
      role: 'Pet aggressive stance',
      looks: {
        FANTASY: 'a curved ivory fang daubed with a red war-paint slash',
        AGE_OF_STEAM: 'a sprung iron bear trap with its jagged steel jaws open',
        MODERN: 'a red warning triangle round a black paw print with its claws out',
        CYBERPUNK: 'a brushed-steel jaw of bared steel fangs with a glowing red threat light between them',
        SPACE_OPERA: 'a white claw slash of three glowing red energy lines',
      },
    },
  ],
};
