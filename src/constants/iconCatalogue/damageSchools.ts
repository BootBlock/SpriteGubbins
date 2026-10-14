import type { DamageSchool, DamageSchoolDefinition } from '../../types/iconCatalogue.ts';

/**
 * Each damage school's name in every family of world, and the one colour its icons are led by.
 *
 * **Domain colours, not interface ones**: nothing in the app paints with these. They are stated in the
 * compiled prompt, on every spell's inventory line, and measured by `damageSchools.test.ts` — which is
 * why the file is listed among the domain-colour paths in `tests/raw-colour-literals.test.ts`.
 *
 * **Chosen for two measurements, and held to both.** Every colour, and every shade and wash of it a
 * full-bleed square's backdrop can fall to, stays out of the reach of every background key, since the
 * keying removes whatever lies within it wherever it sits on the sheet. And every pair stays at least
 * 40 apart in OKLab (`pixelDistance`), since two schools a player cannot tell apart at 32 px are one
 * school. The first proposal failed the second: a pale slate kinetic against a pale sky cryo sat 24
 * apart, and an emerald nanite against a lime toxic 28, under five of OKLab's just-noticeable steps
 * each (`damageSchools.test.ts` says why 40 is the floor). So kinetic became a warm steel, voltaic took the electric blue a cyberpunk game gives
 * electrical damage, and nanite took the gold a fantasy game gives holy light.
 *
 * Each colour is said in words before its hex, so the model reads the hue before the figure.
 */
export const DAMAGE_SCHOOL_DEFINITIONS: Readonly<Record<DamageSchool, DamageSchoolDefinition>> = {
  KINETIC: {
    label: 'Kinetic',
    names: {
      FANTASY: 'physical',
      AGE_OF_STEAM: 'steel',
      MODERN: 'ballistic',
      CYBERPUNK: 'kinetic',
      SPACE_OPERA: 'gravitic',
    },
    colourName: 'steel grey',
    hex: '#B8B2A7',
  },
  THERMAL: {
    label: 'Thermal',
    names: {
      FANTASY: 'fire',
      AGE_OF_STEAM: 'furnace',
      MODERN: 'incendiary',
      CYBERPUNK: 'thermal',
      SPACE_OPERA: 'plasma',
    },
    colourName: 'orange',
    hex: '#F97316',
  },
  CRYO: {
    label: 'Cryo',
    names: {
      FANTASY: 'frost',
      AGE_OF_STEAM: 'glacial',
      MODERN: 'cryogenic',
      CYBERPUNK: 'cryo',
      SPACE_OPERA: 'cryonic',
    },
    colourName: 'ice cyan',
    hex: '#67E8F9',
  },
  VOLTAIC: {
    label: 'Voltaic',
    names: {
      FANTASY: 'storm',
      AGE_OF_STEAM: 'galvanic',
      MODERN: 'electric',
      CYBERPUNK: 'voltaic',
      SPACE_OPERA: 'ion',
    },
    colourName: 'electric blue',
    hex: '#3B82F6',
  },
  TOXIC: {
    label: 'Toxic',
    names: {
      FANTASY: 'nature',
      AGE_OF_STEAM: 'alchemical',
      MODERN: 'chemical',
      CYBERPUNK: 'toxic',
      SPACE_OPERA: 'biotoxin',
    },
    colourName: 'acid green',
    hex: '#84CC16',
  },
  NEURAL: {
    label: 'Neural',
    names: {
      FANTASY: 'shadow',
      AGE_OF_STEAM: 'mesmeric',
      MODERN: 'psychic',
      CYBERPUNK: 'neural',
      SPACE_OPERA: 'psionic',
    },
    colourName: 'violet',
    hex: '#A855F7',
  },
  NETRUN: {
    label: 'Netrun',
    names: {
      FANTASY: 'arcane',
      AGE_OF_STEAM: 'aetheric',
      MODERN: 'digital',
      CYBERPUNK: 'netrun',
      SPACE_OPERA: 'quantum',
    },
    colourName: 'hot pink',
    hex: '#E11D74',
  },
  NANITE: {
    label: 'Nanite',
    names: {
      FANTASY: 'holy',
      AGE_OF_STEAM: 'luminous',
      MODERN: 'radiant',
      CYBERPUNK: 'nanite',
      SPACE_OPERA: 'stellar',
    },
    colourName: 'gold',
    hex: '#FACC15',
  },
};
