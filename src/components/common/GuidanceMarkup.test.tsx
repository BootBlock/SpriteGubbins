import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { GuidanceMarkup } from './GuidanceMarkup.tsx';

function renderInCard(text: string) {
  render(
    <>
      <button type="button" aria-describedby="card">
        Trigger
      </button>
      <span id="card" role="tooltip">
        <GuidanceMarkup text={text} />
      </span>
    </>,
  );
  return screen.getByRole('tooltip');
}

describe('GuidanceMarkup', () => {
  it('sets code, bold and italics as their own elements', () => {
    const card = renderInCard('Set `CUSTOM` and **read** the _whole_ card.');

    expect(card.querySelector('code')).toHaveTextContent('CUSTOM');
    expect(card.querySelector('strong')).toHaveTextContent('read');
    expect(card.querySelector('em')).toHaveTextContent('whole');
    expect(card).not.toHaveTextContent('`');
    expect(card).not.toHaveTextContent('*');
  });

  it('renders a bulleted list the reader’s assistive technology can count', () => {
    const card = renderInCard('Pick one:\n\n- The first.\n- The second.');

    const list = within(card).getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent?.trim()),
    ).toEqual(['The first.', 'The second.']);
  });

  it('keeps a gap between two paragraphs in the description it gives its trigger', () => {
    renderInCard('The first paragraph.\n\nThe second.');

    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAccessibleDescription(
      'The first paragraph. The second.',
    );
  });

  it('uses only phrasing content, so it is valid inside a label or a button', () => {
    const card = renderInCard('A paragraph.\n\n- An item.');

    expect(card.querySelector('p, ul, ol, li, div')).toBeNull();
  });
});
