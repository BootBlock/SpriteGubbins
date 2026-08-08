// Vitest setup, applied to every test file.
//
// `@testing-library/jest-dom` adds the DOM-aware matchers component tests are written against
// (`toBeInTheDocument`, `toHaveAccessibleName`, `toBeDisabled`, …). Importing it for its side
// effect is the documented way to register them.
import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount anything a test rendered. Without this, components persist across tests in the same
// file and a query like `getByRole('button')` starts failing with "found multiple elements" —
// a confusing failure in a test that is itself correct.
afterEach(() => {
  cleanup();
});

/**
 * A stand-in for the popover API, which happy-dom does not implement.
 *
 * The app's two floating surfaces — the combo box's suggestion list and the tooltip's guidance
 * card — call `showPopover()` to reach the top layer (see `src/hooks/useAnchoredSurface.ts`). The
 * hook checks for the method before using it, so without these stubs the tests would silently take
 * the *un-lifted* path and stop covering the thing they are there to cover.
 *
 * Deliberately no-ops, and deliberately not state machines. The top layer is a paint concern no DOM
 * assertion can observe, and the platform's own guards are silent: measured in Edge, showing a
 * popover that is already showing, hiding one that was never shown, and hiding one that has been
 * removed from the document all return without throwing (HTML's "check popover validity" returns
 * false rather than raising). A stub that threw on any of those would be enforcing an invariant no
 * browser enforces, and any test leaning on it would be testing this file.
 */
// A `typeof` check rather than `'showPopover' in …`: the property *is* on the TypeScript type, so
// the `in` form narrows the absent branch to `never` and the assignments below stop compiling.
if (typeof HTMLElement.prototype.showPopover !== 'function') {
  HTMLElement.prototype.showPopover = function showPopover() {
    // Nothing to model — see above.
  };

  HTMLElement.prototype.hidePopover = function hidePopover() {
    // Nothing to model — see above.
  };
}
