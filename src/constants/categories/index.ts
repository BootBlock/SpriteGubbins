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
import { INTERFACE } from './interface.ts';
import { TERRAIN } from './terrain.ts';
import { PORTRAIT } from './portrait.ts';
import { ICON } from './icon.ts';
import { BACKGROUND } from './background.ts';
import { FONT } from './font.ts';

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
  INTERFACE,
  TERRAIN,
  PORTRAIT,
  ICON,
  BACKGROUND,
  FONT,
};

/**
 * What this category calls one of the sixteen fields — `species` is "Species / Archetype" on a
 * character and "Vehicle Class" on a vehicle.
 *
 * **The compiled prompt reads these, not just the studio.** Section 1 of the prompt writes the label
 * beside the value, and section 4's additional-anatomy heading takes the one belonging to that
 * field, so the model is shown the same vocabulary the user chose the value under. Section 1 used to
 * fix its own labels in `constants/promptTemplate.ts`, which meant six categories reading one
 * category's words: a vehicle's *Service Condition* arrived as "Age / Vitality".
 *
 * **Throws rather than falling back**, for the reason `templateEngine.substitute` throws on an
 * unfilled token — a blank label emits `- : Field-Worn Service`, which reads as prose to satisfy
 * rather than as a missing label. `categories.test.ts` pins every category to all sixteen keys, so
 * reaching this is an authoring error and not a state a user can get into.
 */
export function fieldLabelFor(category: SubjectCategory, key: SubjectFieldKey): string {
  const field = CATEGORY_OPTIONS[category].fields.find((candidate) => candidate.key === key);
  if (field === undefined) throw new Error(`Category ${category} defines no “${key}” field.`);
  return field.label;
}

/**
 * The value this category's field offers for *the subject has none of this*, or `null` where the
 * pool offers no such thing.
 *
 * Read rather than recognised. There is no spelling a sentinel reliably takes: the eight pools that
 * carry one spell it seven different ways — `NONE` twice, and `No Treatment`, `No Secondary Layer`,
 * `Clear — No Overlay`, `Bare Shoulders`, `Bare Untouched Ground` and `Bare Unclad Frame` once each.
 * Guessing would be wrong in both directions, too: an INTERFACE `Bare Machined Chamfer` is a real edge
 * treatment and an OBJECT `Freestanding Base` is a real mount, so a rule keyed on the word *bare*
 * would take both of those for absences. Each pool names its own, and `categories.test.ts` fails on
 * one the pool does not offer.
 *
 * `null` rather than a throw, because most fields have no such value and asking is not an error —
 * which is the opposite of {@link fieldLabelFor}, where every category defines every key.
 */
export function absentOptionFor(category: SubjectCategory, key: SubjectFieldKey): string | null {
  return CATEGORY_OPTIONS[category].fields.find((candidate) => candidate.key === key)?.absentOption ?? null;
}

/**
 * The phrase naming what this value carries on one of the subject's own flanks, or `null` where the
 * pool declares nothing for it.
 *
 * Read rather than recognised, for the reason {@link absentOptionFor} is: nothing in the words
 * `Holstered Sidearm & Pouch` distinguishes it from `Tactical Kevlar & Plates` but knowing what they
 * mean, and a rule keyed on a word would be wrong in both directions — `Shoulder Pauldrons & Cloak`
 * is a pair and `Bandolier Of Vials` is not. Each pool names its own, and `categories.test.ts` fails
 * on a value the pool does not offer or a phrase the value does not contain.
 *
 * **Exact rather than fuzzy, which is what bounds the claim.** Every subject field is an unfiltered
 * combo box, so a typed value matches nothing here and the compiler derives no feature from it —
 * which is what section 9's second branch is for. See `FieldOption.oneSidedOptions` for what may be
 * declared and why the undeclared case is the safe one.
 */
export function oneSidedFeatureFor(
  category: SubjectCategory,
  key: SubjectFieldKey,
  value: string,
): string | null {
  const field = CATEGORY_OPTIONS[category].fields.find((candidate) => candidate.key === key);
  return field?.oneSidedOptions?.[value] ?? null;
}

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
