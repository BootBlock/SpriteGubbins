import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.tsx';

function Explodes(): never {
  throw new Error('the chunk did not arrive');
}

/**
 * Splitting the app into a chunk per view brought a failure the single bundle could not have: a
 * fetch that happens while the reader is working and can fail on its own. `React.lazy` caches the
 * rejection, so the tab is dead for the rest of the session — and with no boundary React unmounts
 * the whole root and leaves a white page. This is the assertion that the floor is there.
 */
describe('ErrorBoundary', () => {
  it('keeps the app up and offers the one thing that clears a cached rejection', () => {
    // React logs the caught error itself, and the boundary logs its own line. Both are expected
    // here, and neither is what is under test.
    const console_error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary what="the Studio view">
        <Explodes />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Could not load the Studio view');
    expect(screen.getByRole('button', { name: 'Reload the app' })).toBeInTheDocument();

    console_error.mockRestore();
  });

  it('renders its children untouched while nothing has failed', () => {
    render(
      <ErrorBoundary what="the Studio view">
        <p>the view</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('the view')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload the app' })).toBeNull();
  });
});
