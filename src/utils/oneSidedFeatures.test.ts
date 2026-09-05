import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { oneSidedFeatures } from './oneSidedFeatures.ts';

/**
 * The walk from a subject to the features section 3 names, which is the half a compiler cannot work
 * out for itself.
 *
 * What it is protecting is an absence: a subject that declares nothing takes section 9's other
 * branch, and the whole point of the change is that the *declared* branch fires wherever it can. A
 * walk that quietly returned nothing would leave the prompt exactly as it was, with every test
 * about the enumeration still green because none of them would reach it.
 */

/** The subject with one field replaced, which is how a one-sided value gets into a category. */
function withField(
  category: SubjectCategory,
  key: (typeof SUBJECT_FIELD_KEYS)[number],
  value: string,
): SubjectDefinition {
  return { ...defaultSubjectFor(category), [key]: value };
}

describe('the features a subject carries on one flank', () => {
  it('names both of the pair the pack measured failing, on CHARACTER’s own default', () => {
    // `defaultSubjectFor` takes the first option of every pool, and CHARACTER's first two are
    // `Neon Visor & Undercut` and `Holstered Sidearm & Pouch` — which is exactly the subject
    // `S1-cardinals` ran. On those sheets the holster was drawn on the west torso and pelvis and
    // absent from the east ones, and the head reflected anyway: the prompt asked for *one* witness,
    // the model named the one it had been given, and the second attribute was left free.
    expect(oneSidedFeatures('CHARACTER', defaultSubjectFor('CHARACTER'))).toEqual([
      'undercut',
      'holstered sidearm and pouch',
    ]);
  });

  it('names one where the subject carries one', () => {
    // The studio's opening preset is this configuration rather than the category default — its
    // `worn_details` is `Fibre-Optic Cabling`, which is not one-sided — so the head is the whole of
    // what section 3 has to fix a side for there.
    const oneOnly = { ...defaultSubjectFor('CHARACTER'), worn_details: 'Fibre-Optic Cabling' };

    expect(oneSidedFeatures('CHARACTER', oneOnly)).toEqual(['undercut']);
  });

  it('names none where the subject carries none', () => {
    const symmetric = {
      ...defaultSubjectFor('CHARACTER'),
      face_head: 'Full Enclosed Helmet',
      worn_details: 'Fibre-Optic Cabling',
    };

    expect(oneSidedFeatures('CHARACTER', symmetric)).toEqual([]);
  });

  it('derives nothing from free text, which is what section 9’s other branch is for', () => {
    // The bound on the whole arrangement, asserted rather than assumed. Every subject field is an
    // unfiltered combo box, so a reader can type a one-sided feature no pool declares — and the
    // compiler cannot tell that string from any other. Losing this would mean the delegation is
    // dead code nobody notices has stopped firing.
    const typed = {
      ...withField('CHARACTER', 'worn_details', 'A holstered sidearm on the left hip'),
      face_head: 'A neon visor with the hair shaved back on one side',
    };

    expect(oneSidedFeatures('CHARACTER', typed)).toEqual([]);
  });

  it('takes the field order every category shares, not the order its own file happens to use', () => {
    // Section 6 asks the side a feature sits on to match across a whole series, and those sheets are
    // separate generations sharing only this text. A ledger that reordered itself between them is
    // the one place a reader could not check that by eye.
    const subject = {
      ...withField('CHARACTER', 'anatomy', 'Humanoid With Prosthetic Limb'),
      face_head: 'Monocular Cyber Eye',
      worn_details: 'Bandolier Of Vials',
    };
    const keyOrder = SUBJECT_FIELD_KEYS.indexOf('face_head');

    expect(keyOrder).toBeLessThan(SUBJECT_FIELD_KEYS.indexOf('anatomy'));
    expect(oneSidedFeatures('CHARACTER', subject)).toEqual([
      'monocular cyber eye',
      'prosthetic limb',
      'bandolier of vials',
    ]);
  });

  it('never repeats a phrase two fields happen to share, which is settled at the pools', () => {
    // Two paragraphs stating the same visibility read as two features, and section 9 would then ask
    // for both to be traced. The walk does not deduplicate — a guard there would be unreachable, so
    // it would be dead code claiming to defend something. This is the guarantee instead, and it
    // fails at the declaration that broke it rather than swallowing it silently downstream.
    const declared = SUBJECT_CATEGORIES.flatMap((category) =>
      CATEGORY_OPTIONS[category].fields.flatMap((field) => Object.values(field.oneSidedOptions ?? {})),
    );
    expect(new Set(declared).size).toBe(declared.length);
  });

  it('reaches exactly one category’s default, and that one is the measured case', () => {
    // A default is what compiles on a cleared studio and what a category switch produces, so which
    // of them derive a feature is worth pinning rather than discovering. CHARACTER does because its
    // pools happen to open on the two values the pack ran; the other twelve open on symmetric ones.
    // A thirteenth turning up here is not a fault — a reader may legitimately pick a one-sided
    // value — but it changes what that category's default prompt says, which should be a decision.
    const deriving = SUBJECT_CATEGORIES.filter(
      (category) => oneSidedFeatures(category, defaultSubjectFor(category)).length > 0,
    );

    expect(deriving).toEqual(['CHARACTER']);
  });
});
