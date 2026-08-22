import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink.tsx';

/**
 * What is pinned here is the bypass, not the styling: that the link exists, that it names a target
 * the shell actually renders, and that it is held out of sight by an offset rather than by anything
 * that would take it out of the tab order. A `hidden`, a `display: none` or a screen-reader-only
 * class gone wrong all leave a link that reads correctly in the DOM and can never be reached — and
 * a bypass nobody can focus is the defect this component was written to fix.
 */
describe('SkipLink', () => {
  it('points at the landmark the shell gives that id', () => {
    render(<SkipLink />);

    // `App` renders `<main id="main-content">`; a fragment naming anything else scrolls nowhere.
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
  });

  it('is held out of sight by one property, and comes back on focus', () => {
    render(<SkipLink />);

    // Both halves decide `top`, so the focus variant wins on specificity rather than on where the
    // two rules happen to land in the generated stylesheet — which is what a second `position` or a
    // screen-reader-only class beside them would have made this depend on.
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link.className).toContain('-top-24');
    expect(link.className).toContain('focus:top-4');
    expect(link.className).not.toContain('sr-only');
  });

  it('stays in the tab order however it is painted', () => {
    render(<SkipLink />);

    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).not.toHaveAttribute('hidden');
    expect(link).not.toHaveAttribute('aria-hidden');
    expect(link).not.toHaveAttribute('tabindex');
  });
});
