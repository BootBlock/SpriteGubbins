import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExternalLink } from './ExternalLink.tsx';

/**
 * The only way anything in this app reaches another origin.
 *
 * Installed, the app runs in a window with no address bar and no back button, so a link followed in
 * place strands the reader on somebody else's site. The link therefore always opens a new context,
 * never hands that context a way back through `window.opener`, and tells both a sighted reader and a
 * screen-reader user that focus is about to leave.
 */
function renderLink(): HTMLElement {
  render(<ExternalLink href="https://example.com/docs">the model’s documentation</ExternalLink>);
  return screen.getByRole('link', { name: /^the model’s documentation/ });
}

describe('ExternalLink', () => {
  it('opens a new context, with no way back to this window', () => {
    const link = renderLink();

    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says in its name that it opens a new tab, and keeps the arrow out of it', () => {
    // The arrow is the sighted reader's warning and the parenthetical is the screen-reader user's. An
    // unhidden arrow would be read out as "north east arrow" in the middle of the name.
    expect(renderLink()).toHaveAccessibleName('the model’s documentation (opens in a new tab)');
  });
});
