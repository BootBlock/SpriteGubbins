import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import type { SubjectDefinition } from '../../types/subject.ts';
import { IdentitySubjectDigest } from './IdentitySubjectDigest.tsx';

/**
 * What types cannot state about this control: that it reads the subject at the moment it is
 * pressed, and that pressing it is safe.
 *
 * The derivation and the fold each have their own unit tests. What is left is the wiring between
 * them and the two stores — and the guard that stops an empty subject silently deleting a digest the
 * user has been writing.
 */

/** Every field cleared, then the named ones answered. */
function subjectWith(answers: Partial<SubjectDefinition>): SubjectDefinition {
  const subject = Object.fromEntries(SUBJECT_FIELD_KEYS.map((key) => [key, ''])) as SubjectDefinition;
  return { ...subject, ...answers };
}

const CYBORG = subjectWith({
  species: 'Cybernetic Cyborg',
  face_head: 'Neon Visor & Undercut',
  primary_colours: 'Matte Charcoal Black & Gunmetal',
});

const DESCRIBED =
  'Form: Cybernetic Cyborg; Features: Neon Visor & Undercut; Colour: Matte Charcoal Black & Gunmetal';

function press() {
  fireEvent.click(screen.getByRole('button', { name: 'Describe the subject' }));
}

beforeEach(() => {
  useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, identityLock: '' } });
  useSubjectStore.setState({ category: 'CHARACTER', subject: CYBORG });
});

describe('IdentitySubjectDigest', () => {
  it('writes the subject into the lock beside whatever the user already had there', () => {
    useOutputStore.getState().setOutputField('identityLock', 'Three amber chest lights; Palette: #1E1E24');
    render(<IdentitySubjectDigest />);
    press();

    expect(useOutputStore.getState().output.identityLock).toBe(
      `Three amber chest lights; Palette: #1E1E24; ${DESCRIBED}`,
    );
  });

  it('reads the subject as it stands when pressed, not as it stood when rendered', () => {
    render(<IdentitySubjectDigest />);

    // The subject panel is a separate group and the user may edit it with this one on screen. The
    // control deliberately holds no subscription to the store, so this is the case that would break
    // if it captured the subject at render time instead.
    useSubjectStore.setState({ subject: { ...CYBORG, species: 'Android' } });
    press();

    expect(useOutputStore.getState().output.identityLock).toBe(
      DESCRIBED.replace('Cybernetic Cyborg', 'Android'),
    );
  });

  it('is safe to press twice', () => {
    render(<IdentitySubjectDigest />);
    press();
    press();

    expect(useOutputStore.getState().output.identityLock).toBe(DESCRIBED);
  });

  it('leaves a line whose fields have since been cleared exactly as the user edited it', () => {
    // The hazard the guidance invites: it asks the user to edit these lines into concrete detail
    // from the sheet they accepted. Clearing the fields behind one in the panel above must not then
    // delete what they wrote — only the segments with something to say are folded.
    const edited = `Features: three amber chest lights in a vertical row; ${DESCRIBED.replace('Features: Neon Visor & Undercut; ', '')}`;
    useOutputStore.getState().setOutputField('identityLock', edited);
    useSubjectStore.setState({ subject: { ...CYBORG, face_head: '' } });
    render(<IdentitySubjectDigest />);
    press();

    expect(useOutputStore.getState().output.identityLock).toBe(edited);
    expect(useUIStore.getState().toastMessage).toBe(
      'Wrote 2 lines describing the subject into the identity lock',
    );
  });

  it('leaves the lock alone when the subject states none of the fields it reads', () => {
    // Only the fields the digest deliberately never reproduces are answered, so there is nothing to
    // write — and stripping the segments an earlier press left would destroy prose the user has
    // since edited.
    useSubjectStore.setState({ subject: subjectWith({ role: 'Paladin', setting: 'Dark Fantasy' }) });
    useOutputStore.getState().setOutputField('identityLock', DESCRIBED);
    render(<IdentitySubjectDigest />);
    press();

    expect(useOutputStore.getState().output.identityLock).toBe(DESCRIBED);
    expect(useUIStore.getState().toastMessage).toBe(
      'The subject has none of those fields filled in — the identity lock is unchanged',
    );
  });
});
