import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../../constants/categories/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { studioUndoDepth } from '../../utils/studioHistory.ts';
import { SubjectActions } from './SubjectActions.tsx';

/**
 * That both acts reach the store through `act()`, which is what puts the subject they discard on the
 * undo stack.
 *
 * Reset is what this suite was written for. It was store API with no control at all until the button
 * shipped, so what is worth pinning is not that the fields end up at the defaults — a handler that
 * wrote them directly would manage that — but that the step to get back is there afterwards. A Reset
 * that bypassed `resetSubject` would look identical on screen and lose the subject for good.
 *
 * Asserted through the store rather than through rendered fields because this component renders no
 * fields: the sixteen `ComboBox`es are `SubjectForm`'s, and they read the state asserted here.
 */
beforeEach(() => {
  useUIStore.setState({ toastMessage: null });
  useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
  // The stack is module state shared with every other suite that has touched this store, so the
  // depth below counts *this* test's acts rather than the file's.
  useSubjectStore.getState().openStudio();
});

describe('SubjectActions', () => {
  it('puts every field back to the category’s defaults, recording a step to undo it', async () => {
    const user = userEvent.setup();
    render(<SubjectActions />);

    await user.click(screen.getByRole('button', { name: /randomise/i }));
    const randomised = useSubjectStore.getState().subject;

    await user.click(screen.getByRole('button', { name: /^reset /i }));

    expect(useSubjectStore.getState().subject).toEqual(defaultSubjectFor('CHARACTER'));
    expect(useUIStore.getState().toastMessage).toBe('Reset Humanoid Character properties to their defaults');
    // Two acts, so two steps back: the randomised subject, and the one the panel opened on.
    expect(studioUndoDepth(useSubjectStore.getState().history)).toBe(2);

    useSubjectStore.getState().undoStudio();
    expect(useSubjectStore.getState().subject).toEqual(randomised);
  });

  it('leaves the category where it is — Reset is not a category switch', async () => {
    const user = userEvent.setup();
    useSubjectStore.setState({ category: 'VEHICLE', subject: defaultSubjectFor('VEHICLE') });
    useSubjectStore.getState().openStudio();
    render(<SubjectActions />);

    await user.click(screen.getByRole('button', { name: /^reset /i }));

    expect(useSubjectStore.getState().category).toBe('VEHICLE');
  });

  it('names the category in what Reset says it did, for the reader and for voice control', () => {
    useSubjectStore.setState({ category: 'VEHICLE', subject: defaultSubjectFor('VEHICLE') });
    render(<SubjectActions />);

    const label = `Reset ${CATEGORY_OPTIONS.VEHICLE.label} properties to their defaults`;
    // The visible word starts the accessible name, so both routes to the control still find it.
    expect(screen.getByRole('button', { name: label })).toHaveTextContent('Reset');
  });
});
