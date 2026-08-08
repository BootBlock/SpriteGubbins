import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { REPOSITORY_URL } from '../../constants/about.ts';
import { Wordmark } from './Wordmark.tsx';

/**
 * The wordmark is the app's only outbound link outside the About section, and the only one whose
 * visible content gives no hint that it *is* one — it reads as the app's own name. So what is
 * pinned here is not the styling but the three things that make it safe and legible to follow.
 */
describe('Wordmark', () => {
  it('leads to the public repository', () => {
    render(<Wordmark />);

    // The constant, not a literal: the About section links the same repository, and a URL written
    // out twice is one that can end up pointing two places.
    expect(screen.getByRole('link', { name: /Sprite Gubbins/ })).toHaveAttribute('href', REPOSITORY_URL);
  });

  it('opens in a new context, and tells nobody where it came from', () => {
    render(<Wordmark />);

    // The app is installable: in standalone display mode there is no back button, so a link
    // followed in place is a one-way trip out of the application.
    const wordmark = screen.getByRole('link', { name: /Sprite Gubbins/ });
    expect(wordmark).toHaveAttribute('target', '_blank');
    expect(wordmark).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says what pressing it does, to a pointer and to a screen reader alike', () => {
    render(<Wordmark />);

    // Two halves of one warning, and neither may go without the other: the `title` is what a
    // sighted user gets on hover, and the accessible name is what everyone else gets.
    expect(screen.getByTitle(/GitHub/)).toBe(screen.getByRole('link', { name: /Sprite Gubbins/ }));
    expect(screen.getByRole('link', { name: /\(opens in a new tab\)$/ })).toBeInTheDocument();
  });
});
