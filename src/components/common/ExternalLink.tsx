import type { ReactNode } from 'react';

interface ExternalLinkProps {
  readonly href: string;
  readonly children: ReactNode;
}

/**
 * A link out of the application — the only kind it has.
 *
 * This app makes no outbound request of its own, so an anchor the user chooses to follow is the
 * single way anything here reaches another origin. Cross-origin isolation does not object: COEP
 * `require-corp` governs *subresources* a page loads, not a navigation the user initiates.
 *
 * Always opens a new context, because the app is installable. In `standalone` display mode there is
 * no address bar and no back button, so following a link in place would strand the user in a
 * chromeless window showing somebody else's site with no way back. `noopener noreferrer` because
 * the opened page has no business reaching back through `window.opener`, nor learning which page
 * sent it.
 *
 * The arrow is decorative and the parenthetical is not shown: between them a sighted user and a
 * screen-reader user each get the same warning that focus is about to leave the app.
 */
export function ExternalLink({ href, children }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm font-semibold text-accent-soft underline decoration-accent/40 underline-offset-4 transition-colors duration-390 hover:text-ink hover:decoration-accent"
    >
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
