import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SubjectForm } from './SubjectForm.tsx';

/**
 * That the *Extra Overlay Pieces* field says, under itself and as its accessible description, when a
 * piece repeats one the overlay sheet already draws (audit finding T8).
 */
const NOTE =
  'The “Overlay pieces” sheet already draws Selected Ring, so it is drawn a second time, as a separate file.';

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

function field(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Extra Overlay Pieces' });
}

describe('the Extra Overlay Pieces note', () => {
  it('describes the field with the repeated piece', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: { ...defaultSubjectFor('ICON'), additional_anatomy: 'Selected Ring ×1' },
    });
    render(<SubjectForm />);

    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(field()).toHaveAccessibleDescription(NOTE);
  });

  it('describes nothing where the pieces sit well', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: { ...defaultSubjectFor('ICON'), additional_anatomy: 'Equipped Corner Tick ×1' },
    });
    render(<SubjectForm />);

    expect(field()).not.toHaveAttribute('aria-describedby');
  });
});
