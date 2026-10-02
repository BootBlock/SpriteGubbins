import { describe, it } from 'vitest';
import { expectSkippedPairingsMatch, iconSkippedCases } from '../test/iconSkippedPairings.ts';

/**
 * That ICON's skipped pairings compile to the prompt their resolution names, for the plain variant the
 * sweeps in `promptCompiler.test.ts` compile. A file per variant so the three run side by side; the
 * rule and its reason are `iconSkippedPairings.ts`'s.
 */
describe('ICON pairings the sweeps skip (plain)', () => {
  it.each(iconSkippedCases('plain'))(
    'compiles %s, sheet index %i, under %s to the offered pairing’s prompt',
    (_name, sheetIndex, mode, configuration) => {
      expectSkippedPairingsMatch(configuration, sheetIndex, mode);
    },
  );
});
