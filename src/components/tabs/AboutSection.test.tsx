import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import packageJson from '../../../package.json';
import { AboutSection } from './AboutSection.tsx';

/**
 * The version shown here is inlined by Vite's `define`, not imported — so nothing in the type
 * system connects it to package.json, and a renamed or dropped `define` fails at runtime rather
 * than at build. That is the drift these tests exist for: the deploy workflow refuses to publish
 * new code under an already-tagged version and then tags the release `v<version>`, so a stale
 * number here would misname the very build the user is reading, in the one place a bug report
 * would quote.
 */
describe('AboutSection', () => {
  it('credits the author, and links to their site', () => {
    render(<AboutSection />);

    const author = screen.getByRole('link', { name: /Joe Cox/ });
    expect(author).toHaveAttribute('href', 'https://bootblock.co.uk');
  });

  it('shows the version package.json declares, not a hand-copied one', () => {
    render(<AboutSection />);

    // Asserted against the manifest on disk rather than a literal, so bumping the version for a
    // release cannot leave this passing against the old number.
    expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
  });

  it('opens every outbound link in a new context, and tells nobody where it came from', () => {
    render(<AboutSection />);

    // The app is installable: in standalone display mode there is no back button, so a link
    // followed in place is a one-way trip out of the application.
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('warns screen-reader users that a link leaves the app, as the arrow does for everyone else', () => {
    render(<AboutSection />);

    // The visible arrow is aria-hidden, so without this the accessible name would be the bare
    // link text and the warning would reach sighted users only.
    expect(screen.getByRole('link', { name: /Joe Cox \(opens in a new tab\)/ })).toBeInTheDocument();
  });
});
