import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import { lookFamilyOfWorld } from '../constants/iconCatalogue/lookFamilyOfWorld.ts';
import type { DamageSchool } from '../types/iconCatalogue.ts';

/**
 * What a world calls a damage school, lower case: `fire` in a fantasy world, `thermal` in a cyberpunk
 * one.
 *
 * **A world the family table does not name is told the catalogue's own name**, `thermal`, rather than
 * a guess at a family, for `iconLookText`'s reason: the reader typed a world no family captures, and the
 * catalogue's name is the one the picker files the school under.
 */
export function damageSchoolName(school: DamageSchool, world: string): string {
  const definition = DAMAGE_SCHOOL_DEFINITIONS[school];
  const family = lookFamilyOfWorld(world);
  return family === null ? definition.label.toLowerCase() : definition.names[family];
}
