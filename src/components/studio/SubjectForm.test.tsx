import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../../constants/categories/index.ts';
import { SUBJECT_FIELD_GROUPS } from '../../constants/subjectGroups.ts';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { SubjectForm } from './SubjectForm.tsx';

/**
 * That the grouping did not lose a field.
 *
 * `SubjectForm` renders through `SUBJECT_FIELD_GROUPS` rather than off the category's own list, and
 * the failure mode that introduces is **silent**: a key missing from the grouping leaves the store
 * holding its value and the compiler emitting it, so the prompt still reads correctly and the only
 * symptom is a control the user cannot find. `subjectGroups.test.ts` catches that at the data level;
 * this catches it at the level that actually reaches the screen, in every category — each carries
 * completely different labels for the same sixteen keys.
 *
 * Foldedness is asserted on `details[open]` rather than on whether a field can still be queried.
 * happy-dom does not implement the user-agent rule that hides a shut `<details>`'s contents, so the
 * fields remain findable there while being invisible in every real browser; `open` is the state the
 * component actually controls and the only one both agree on.
 */
beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
});

function openGroupCount(): number {
  return document.querySelectorAll('details[open]').length;
}

describe('SubjectForm', () => {
  it.each(SUBJECT_CATEGORIES)('renders every one of %s’s sixteen fields', (category) => {
    useSubjectStore.setState({ category, subject: defaultSubjectFor(category) });
    render(<SubjectForm />);

    for (const field of CATEGORY_OPTIONS[category].fields) {
      expect(
        screen.getByRole('combobox', { name: field.label }),
        `${category} is missing ${field.key}`,
      ).toBeInTheDocument();
    }
  });

  it('heads each group, and keeps the category selector outside them', () => {
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    render(<SubjectForm />);

    for (const group of SUBJECT_FIELD_GROUPS) {
      expect(screen.getByRole('heading', { name: group.heading, level: 3 })).toBeInTheDocument();
    }

    // The category governs the groups rather than sitting in one, so it must not be inside a
    // `<details>` that could fold it away from the fields it resets.
    expect(screen.getByLabelText('Subject Category').closest('details')).toBeNull();
  });

  it('opens every group by default — these fields are the studio’s primary task', () => {
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    render(<SubjectForm />);
    expect(openGroupCount()).toBe(SUBJECT_FIELD_GROUPS.length);
  });

  it('folds a group away without losing what it is set to', async () => {
    const user = userEvent.setup();
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    render(<SubjectForm />);

    const colour = SUBJECT_FIELD_GROUPS.find((group) => group.id === 'subject:colour');
    expect(colour).toBeDefined();
    if (!colour) return;

    await user.click(screen.getByRole('heading', { name: colour.heading }));

    expect(openGroupCount()).toBe(SUBJECT_FIELD_GROUPS.length - 1);
    const { subject } = useSubjectStore.getState();
    expect(
      screen.getByText(`${subject.primary_colours} · ${subject.accent_colours} · ${subject.materials}`),
    ).toBeInTheDocument();
  });

  it('collapses and re-expands the whole panel from one control', async () => {
    const user = userEvent.setup();
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    render(<SubjectForm />);

    await user.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(openGroupCount()).toBe(0);
    // Every group still says what it holds — folded is summarised, not hidden.
    for (const group of SUBJECT_FIELD_GROUPS) {
      expect(screen.getByRole('heading', { name: group.heading })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: /expand all/i }));
    expect(openGroupCount()).toBe(SUBJECT_FIELD_GROUPS.length);
  });
});
