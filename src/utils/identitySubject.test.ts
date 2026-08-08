import { describe, expect, it } from 'vitest';
import { IDENTITY_SUBJECT_SEGMENTS } from '../constants/identityLock.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { withSegments } from './identityDigest.ts';
import { identitySubjectSegments } from './identitySubject.ts';

/** Every field cleared, then the named ones answered — so each test states only what it is about. */
function subjectWith(answers: Partial<SubjectDefinition>): SubjectDefinition {
  const subject = Object.fromEntries(SUBJECT_FIELD_KEYS.map((key) => [key, ''])) as SubjectDefinition;
  return { ...subject, ...answers };
}

/** A subject answered across all three segments. */
const CYBORG = subjectWith({
  species: 'Cybernetic Cyborg',
  anatomy: 'STANDARD HUMANOID',
  build: 'Athletic & Slender',
  silhouette: 'Dynamic Sharp Edges',
  face_head: 'Neon Visor & Undercut',
  clothing: 'Tactical Kevlar & Plates',
  worn_details: 'Holstered Sidearm & Pouch',
  primary_colours: 'Matte Charcoal Black & Gunmetal',
  accent_colours: 'Cyan Neon #06B6D4',
  materials: 'Reinforced Composites & Alloy',
});

describe('IDENTITY_SUBJECT_SEGMENTS', () => {
  it('gives every segment a distinct label carrying neither punctuation the digest reserves', () => {
    // Matching is by `label:`, so a duplicate would make one segment permanently unreachable, a
    // colon inside a label would end the match early, and a semicolon would split it across the
    // separator that divides one segment from the next.
    const labels = IDENTITY_SUBJECT_SEGMENTS.map((segment) => segment.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.filter((label) => /[:;]/.test(label))).toEqual([]);
  });

  it('states no field twice, and none the lock has no business reproducing', () => {
    // The three exclusion groups the constant argues for: section 1's opening context, the one field
    // section 4 counts, and the one negative field.
    const stated = IDENTITY_SUBJECT_SEGMENTS.flatMap((segment) => segment.keys);
    expect(new Set(stated).size).toBe(stated.length);
    expect(SUBJECT_FIELD_KEYS.filter((key) => !stated.includes(key))).toEqual([
      'gender',
      'age',
      'role',
      'setting',
      'exclusions',
      'additional_anatomy',
    ]);
  });
});

describe('identitySubjectSegments', () => {
  it('states each segment as its own fields, in the order the segment lists them', () => {
    expect(identitySubjectSegments(CYBORG)).toEqual([
      {
        label: 'Form',
        value: 'Cybernetic Cyborg, STANDARD HUMANOID, Athletic & Slender, Dynamic Sharp Edges',
      },
      {
        label: 'Features',
        value: 'Neon Visor & Undercut, Tactical Kevlar & Plates, Holstered Sidearm & Pouch',
      },
      {
        label: 'Colour',
        value: 'Matte Charcoal Black & Gunmetal, Cyan Neon #06B6D4, Reinforced Composites & Alloy',
      },
    ]);
  });

  it('drops a cleared field rather than leaving a gap where its value would be', () => {
    // A cleared field means "you decide" everywhere else in the app — the compiler omits its line
    // entirely — so a digest reading `Form: Human, , Dynamic Sharp Edges` would be claiming a blank
    // attribute in the one place the prompt says to reproduce exactly.
    const segments = identitySubjectSegments(
      subjectWith({ species: 'Human', build: '   ', silhouette: 'Dynamic Sharp Edges' }),
    );
    expect(segments[0]).toEqual({ label: 'Form', value: 'Human, Dynamic Sharp Edges' });
  });

  it('returns an empty value for a segment with nothing answered', () => {
    const segments = identitySubjectSegments(subjectWith({ species: 'Human' }));
    expect(segments).toEqual([
      { label: 'Form', value: 'Human' },
      { label: 'Features', value: '' },
      { label: 'Colour', value: '' },
    ]);
  });

  it('says nothing at all about a subject whose stated fields are all cleared', () => {
    // Only the six the lock deliberately never reproduces are answered here, so every segment is
    // empty — which is what tells the control to leave the lock alone rather than strip it.
    const segments = identitySubjectSegments(
      subjectWith({ role: 'Paladin', setting: 'Dark Fantasy', exclusions: 'No weapons' }),
    );
    expect(segments.every((segment) => segment.value === '')).toBe(true);
  });
});

describe('folding the subject into a digest', () => {
  it('leaves hand-written prose and the palette alone', () => {
    const digest = withSegments(
      'Three amber chest lights in a vertical row; Palette: #1E1E24, #334155',
      identitySubjectSegments(CYBORG),
    );

    expect(digest).toBe(
      'Three amber chest lights in a vertical row; Palette: #1E1E24, #334155; ' +
        'Form: Cybernetic Cyborg, STANDARD HUMANOID, Athletic & Slender, Dynamic Sharp Edges; ' +
        'Features: Neon Visor & Undercut, Tactical Kevlar & Plates, Holstered Sidearm & Pouch; ' +
        'Colour: Matte Charcoal Black & Gunmetal, Cyan Neon #06B6D4, Reinforced Composites & Alloy',
    );
  });

  it('does not accumulate a second copy when the subject has moved on', () => {
    const once = withSegments('', identitySubjectSegments(CYBORG));
    const twice = withSegments(once, identitySubjectSegments({ ...CYBORG, species: 'Android' }));

    expect(twice).toBe(once.replace('Cybernetic Cyborg', 'Android'));
  });
});
