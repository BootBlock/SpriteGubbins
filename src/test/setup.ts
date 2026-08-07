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
