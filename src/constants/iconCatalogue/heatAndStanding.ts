import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The wanted level and reputation marks: the heat raised, the pursuit searching after losing sight of
 * you, the heat cleared, a bounty, the four standings a faction holds towards you, reputation gained and
 * lost, and notoriety.
 *
 * **The four standings differ by shape before colour:** hostile is a spiked triangle, neutral a round
 * disc or ring crossed by a level bar, friendly a shield and allied a star, so a colour-blind player, or
 * one reading a grey tint mask, still knows where they stand. Every other mark is its own object.
 */
export const HEAT_AND_STANDING: IconCatalogueGroup = {
  id: 'heat-and-standing',
  label: 'Heat and standing',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'standing-wanted',
      role: 'Wanted and pursued',
      looks: {
        FANTASY: 'a brass alarm bell ringing on an iron bracket',
        AGE_OF_STEAM: 'a brass police whistle on a looped chain',
        MODERN: 'a flashing red and blue rooftop light bar',
        CYBERPUNK: 'a spinning red and blue siren beacon with a hard neon glow on a gunmetal base',
        SPACE_OPERA: 'a red alert klaxon pulsing on a white hull mount',
      },
    },
    {
      id: 'standing-searching',
      role: 'Pursuers searching',
      looks: {
        FANTASY: 'a hooded iron lantern casting a cone of yellow light',
        AGE_OF_STEAM: 'a brass searchlight with a sweeping yellow beam',
        MODERN: 'a black searchlight with a yellow beam fanning outwards',
        CYBERPUNK: 'a gunmetal surveillance camera with an amber scanning cone',
        SPACE_OPERA: 'a white scanner drone sweeping an amber search beam',
      },
    },
    {
      id: 'standing-heat-cleared',
      role: 'Heat cleared',
      looks: {
        FANTASY: 'a pair of opened iron shackles with a broken chain',
        AGE_OF_STEAM: 'a pair of opened brass handcuffs',
        MODERN: 'a green padlock sprung open',
        CYBERPUNK: 'a broken gunmetal tracking cuff with a green unlocked diode',
        SPACE_OPERA: 'a white heat sink with green cooling fins',
      },
    },
    {
      id: 'standing-bounty',
      role: 'Bounty on you',
      looks: {
        FANTASY: 'a leather coin purse pierced by a dagger',
        AGE_OF_STEAM: 'a heavy money sack tied with rope and a red wax seal',
        MODERN: 'a gold coin under a red crosshair',
        CYBERPUNK: 'a gunmetal credit chip inside a neon-red target lock',
        SPACE_OPERA: 'a gold credit ingot inside a red targeting ring',
      },
    },
    {
      id: 'standing-hostile',
      role: 'Hostile standing',
      looks: {
        FANTASY: 'a red downward-pointing triangle of iron spikes',
        AGE_OF_STEAM: 'a red enamel triangle with a jagged edge of brass teeth',
        MODERN: 'a red inverted triangle with spiked corners',
        CYBERPUNK: 'a neon-red spiked triangle flickering over gunmetal',
        SPACE_OPERA: 'a red spiked triangle of light',
      },
    },
    {
      id: 'standing-neutral',
      role: 'Neutral standing',
      looks: {
        FANTASY: 'a plain grey stone disc with a level groove across it',
        AGE_OF_STEAM: 'a grey enamel disc with a flat brass bar across it',
        MODERN: 'a grey circle with a flat horizontal bar',
        CYBERPUNK: 'a neon-amber ring with a flat bar through it on gunmetal',
        SPACE_OPERA: 'a grey ring of light with a level bar through it',
      },
    },
    {
      id: 'standing-friendly',
      role: 'Friendly standing',
      looks: {
        FANTASY: 'a green kite shield with a gold rim',
        AGE_OF_STEAM: 'a green enamel shield with brass rivets',
        MODERN: 'a green rounded shield with a white tick',
        CYBERPUNK: 'a neon-green shield with a gunmetal core',
        SPACE_OPERA: 'a green energy shield with a white rim',
      },
    },
    {
      id: 'standing-allied',
      role: 'Allied standing',
      looks: {
        FANTASY: 'a blue eight-pointed star of enamel set in gold',
        AGE_OF_STEAM: 'a blue enamel star with brass points',
        MODERN: 'a blue five-pointed star with a thick outline',
        CYBERPUNK: 'a neon-blue five-pointed star with gunmetal points',
        SPACE_OPERA: 'a blue star of light inside a white orbit',
      },
    },
    {
      id: 'standing-reputation-gained',
      role: 'Reputation gained',
      looks: {
        FANTASY: 'a gold laurel wreath with a green ribbon',
        AGE_OF_STEAM: 'a brass medal on a green ribbon',
        MODERN: 'a green upward arrow with a thick outline',
        CYBERPUNK: 'a neon-green upward double chevron on gunmetal',
        SPACE_OPERA: 'a green rising comet with a white tail',
      },
    },
    {
      id: 'standing-reputation-lost',
      role: 'Reputation lost',
      looks: {
        FANTASY: 'a cracked gold medallion with a snapped chain',
        AGE_OF_STEAM: 'a tarnished brass cup knocked on its side',
        MODERN: 'a red cracked trophy cup',
        CYBERPUNK: 'a neon-red cracked gunmetal medallion sparking at the break',
        SPACE_OPERA: 'a red falling meteor breaking apart',
      },
    },
    {
      id: 'standing-notoriety',
      role: 'Notoriety',
      looks: {
        FANTASY: 'a black pennant with a jagged red edge on a spear shaft',
        AGE_OF_STEAM: 'a tattered black flag with a red stripe on a brass pole',
        MODERN: 'a black flame on a red diamond',
        CYBERPUNK: 'a cracked black glass diamond with a burning red core',
        SPACE_OPERA: 'a dark nebula swirl with a red burning core',
      },
    },
  ],
};
