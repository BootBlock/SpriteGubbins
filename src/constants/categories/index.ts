import type {
  CategoryDefinition,
  FieldOption,
  SubjectCategory,
  SubjectDefinition,
  SubjectFieldKey,
} from '../../types/subject.ts';
import { CHARACTER } from './character.ts';
import { CREATURE } from './creature.ts';
import { OBJECT } from './object.ts';
import { ITEM } from './item.ts';
import { BUILDING } from './building.ts';
import { VEHICLE } from './vehicle.ts';
import { EFFECT } from './effect.ts';

/**
 * The complete option pool for every category.
 *
 * Split one file per category purely for size — each definition carries sixteen fields with
 * their full option arrays and tooltips, and the specification is emphatic that none of it may
 * be trimmed. Insertion order here is the order the category selector shows.
 */
export const CATEGORY_OPTIONS: Readonly<Record<SubjectCategory, CategoryDefinition>> = {
  CHARACTER,
  CREATURE,
  OBJECT,
  ITEM,
  BUILDING,
  VEHICLE,
  EFFECT,
};

/** A field's first option — the value that field defaults to. */
function firstOption(fields: readonly FieldOption[], key: SubjectFieldKey): string {
  // Every pool in this folder is non-empty, but `noUncheckedIndexedAccess` is right to insist:
  // an empty array would otherwise hand back `undefined` typed as `string`.
  return fields.find((field) => field.key === key)?.options[0] ?? '';
}

/**
 * The subject a category starts from: every field set to the first option in its pool.
 *
 * Used when the app boots and when the user switches category — a half-filled subject would
 * compile a prompt full of `DEFINED` placeholders, so there is no such thing as an empty
 * subject in this app.
 *
 * Written out key by key rather than assembled from `Object.fromEntries`, which would need a
 * cast to claim the result is complete. Here the compiler *checks* it is: adding a key to
 * `SUBJECT_FIELD_KEYS` without adding it below is an error, which is exactly the half-applied
 * edit worth catching.
 */
export function defaultSubjectFor(category: SubjectCategory): SubjectDefinition {
  const { fields } = CATEGORY_OPTIONS[category];
  return {
    species: firstOption(fields, 'species'),
    gender: firstOption(fields, 'gender'),
    age: firstOption(fields, 'age'),
    role: firstOption(fields, 'role'),
    setting: firstOption(fields, 'setting'),
    build: firstOption(fields, 'build'),
    silhouette: firstOption(fields, 'silhouette'),
    face_head: firstOption(fields, 'face_head'),
    anatomy: firstOption(fields, 'anatomy'),
    clothing: firstOption(fields, 'clothing'),
    worn_details: firstOption(fields, 'worn_details'),
    primary_colours: firstOption(fields, 'primary_colours'),
    accent_colours: firstOption(fields, 'accent_colours'),
    materials: firstOption(fields, 'materials'),
    exclusions: firstOption(fields, 'exclusions'),
    additional_anatomy: firstOption(fields, 'additional_anatomy'),
  };
}
