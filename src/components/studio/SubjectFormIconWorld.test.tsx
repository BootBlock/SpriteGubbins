import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SubjectForm } from './SubjectForm.tsx';

/**
 * That an Icon set marks out *World & Era* as the field deciding each icon's look, and that the roster
 * section's way to it reaches it through a folded group (issue #504) — and that a category with no
 * roster carries none of it, since its world decides no icon.
 */
const NOTE = CATEGORY_OPTIONS.ICON.fields.find((field) => field.key === 'setting')?.note ?? '';

function world(): HTMLElement {
  return screen.getByRole('combobox', { name: 'World & Era' });
}

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('World & Era on an icon set', () => {
  it('describes the field as what decides every catalogue icon’s look', () => {
    useSubjectStore.setState({ category: 'ICON', subject: defaultSubjectFor('ICON') });
    render(<SubjectForm />);

    expect(NOTE).toContain('decides what every catalogue icon shows');
    expect(world()).toHaveAccessibleDescription(NOTE);
  });

  it('moves focus to the field from the roster section, opening its folded group', async () => {
    const user = userEvent.setup({ delay: null });
    useSubjectStore.setState({ category: 'ICON', subject: defaultSubjectFor('ICON') });
    useSectionStore.setState({ openSections: { 'subject:identity': false } });
    render(<SubjectForm />);

    await user.click(screen.getByRole('button', { name: 'Go to World & Era' }));

    expect(useSectionStore.getState().openSections['subject:identity']).toBe(true);
    await waitFor(() => {
      expect(world()).toHaveFocus();
    });
  });

  it('carries neither the note nor the ways to the icon’s content on a category with the same field and no roster', () => {
    useSubjectStore.setState({ category: 'BACKGROUND', subject: defaultSubjectFor('BACKGROUND') });
    render(<SubjectForm />);

    expect(world()).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('button', { name: 'Add your own icon' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to World & Era' })).toBeNull();
    expect(screen.queryByText(/What each icon shows comes from two places/)).toBeNull();
  });
});
