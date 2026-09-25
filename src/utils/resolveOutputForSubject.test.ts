import { describe, expect, it } from 'vitest';

import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { UNSUNG_SAVIOUR_HUMANOID_RIG } from '../constants/presets/unsungSaviourRig.ts';
import type { OutputConfig } from '../types/output.ts';
import { resolveOutputForSubject } from './resolveOutputForSubject.ts';

/**
 * What a loaded rig contract survives, which is the one claim here that is a document.
 *
 * The other six are each judged against a table that says which subjects can honour them, and their
 * tables are tested where they live. This one has no table: a contract names a skeleton, and both a
 * humanoid's and a quadruped's are valid documents this app cannot tell apart. So what it is judged
 * by is provenance — the body it was loaded for, which is the plan table it replaces — and provenance
 * is exactly what a resolver called once per change is placed to lose.
 */
describe('a rig contract across a change of subject', () => {
  const rigged: OutputConfig = {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
    rigMode: 'CUTOUT_RIG',
    rigContract: UNSUNG_SAVIOUR_HUMANOID_RIG,
  };

  it('does not follow the reader into another category, though the rig mode does', () => {
    // The failure this exists for. `resolveRigMode` deliberately keeps a cut-out rig across
    // CHARACTER → CREATURE, and the creature's own pairing has a rig sheet — so before this, the
    // contract rode along and `rigContractPlan` replaced that sheet's inventory with fifteen human
    // pieces, `left-upper-arm` and all, directly above the creature plan's prose about forelimbs and
    // hindquarters. Nothing reported it: the count is fifteen either way, so the budget notice, the
    // atlas grid and section 0 all agreed with each other.
    const resolved = resolveOutputForSubject('CREATURE', defaultSubjectFor('CREATURE'), rigged, {
      category: 'CHARACTER',
      subject: defaultSubjectFor('CHARACTER'),
    });

    expect(resolved.rigMode).toBe('CUTOUT_RIG');
    expect(resolved.rigContract).toBeNull();
  });

  it('survives a change that stays on the plans it was loaded under', () => {
    // The other half, and the one that decides this is a rule rather than a reset: a reader editing
    // their character must not lose a contract they loaded, or every keystroke through `setField`
    // would cost them the file.
    const character = defaultSubjectFor('CHARACTER');
    const renamed = { ...character, species: 'Elf' };
    const resolved = resolveOutputForSubject('CHARACTER', renamed, rigged, {
      category: 'CHARACTER',
      subject: character,
    });

    expect(resolved.rigContract).toBe(UNSUNG_SAVIOUR_HUMANOID_RIG);
  });

  it('goes when the assembly base draws another body, though the rig mode stays', () => {
    // A base that draws a body of its own is a change of skeleton inside one category (issue #286):
    // an octopus's sheets take a cut-out rig, so the rig survives, and a quadruped's contract would
    // replace its heads, mantle and tentacles with four limbs directly below section 1 naming the
    // octopus.
    const quadruped = { ...defaultSubjectFor('CREATURE'), anatomy: 'Quadruped Beast' };
    const octopus = { ...quadruped, anatomy: 'Octopus Tentacled' };
    const resolved = resolveOutputForSubject('CREATURE', octopus, rigged, {
      category: 'CREATURE',
      subject: quadruped,
    });

    expect(resolved.rigMode).toBe('CUTOUT_RIG');
    expect(resolved.rigContract).toBeNull();
  });

  it('goes when the assembly base leaves the subject with no rig at all', () => {
    // Same category, so provenance alone would keep it — and `Single Rigid Object` draws views and
    // states, no rig sheet, so the rig resolves to NONE and the contract is a claim about joints the
    // subject no longer has. It would reach no prompt from there, which is precisely why it has to
    // go here: a preset saved in that state would persist it, and this function exists to stop a
    // store holding a claim its own subject cannot produce.
    const rigid = { ...defaultSubjectFor('OBJECT'), anatomy: 'Single Rigid Object' };
    const resolved = resolveOutputForSubject('OBJECT', rigid, rigged, { category: 'OBJECT', subject: rigid });

    expect(resolved.rigMode).not.toBe('CUTOUT_RIG');
    expect(resolved.rigContract).toBeNull();
  });
});
