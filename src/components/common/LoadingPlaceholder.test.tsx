import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingPlaceholder } from './LoadingPlaceholder.tsx';

/**
 * The stand-in for a view or overlay whose chunk has not arrived.
 *
 * Two things about it cannot be seen in a screenshot. It says what is being waited for, which the sheen
 * cannot; and the sheen is a layer over the caller's surface rather than a class beside it, because
 * `shimmer-surface` and `glass-panel` are both a `background-image` and on one element only one of them
 * survives.
 */
describe('LoadingPlaceholder', () => {
  it('names what is being waited for, as a status rather than an alert', () => {
    render(<LoadingPlaceholder label="Loading Quantise" className="glass-panel h-96" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading Quantise');
  });

  it('lays the sheen over the caller’s surface instead of sharing its element', () => {
    render(<LoadingPlaceholder label="Loading Quantise" className="glass-panel h-96" />);
    const status = screen.getByRole('status');
    const sheen = status.querySelector('.shimmer-surface');

    expect(status).toHaveClass('glass-panel', 'h-96');
    expect(status).not.toHaveClass('shimmer-surface');
    // Decorative: the label is the announcement, and the sheen has nothing to add to it.
    expect(sheen).toHaveAttribute('aria-hidden', 'true');
  });
});
