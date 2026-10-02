import { describe, it } from 'vitest';
import { expectSkippedPairingsMatch, iconSkippedConfigurations } from '../test/iconSkippedPairings.ts';
import { DIRECTIONAL_MODES } from '../types/output.ts';

/**
 * That ICON's skipped pairings compile to the prompt their resolution names, for the anatomy variant the
 * sweeps in `promptCompiler.test.ts` compile. A file per variant so the three run side by side; the
 * rule and its reason are `iconSkippedPairings.ts`'s.
 */
describe('ICON pairings the sweeps skip (anatomy)', () => {
  it.each(
    iconSkippedConfigurations('anatomy').flatMap((configuration) =>
      DIRECTIONAL_MODES.map((mode) => [configuration.name, mode, configuration] as const),
    ),
  )(
    'compiles %s under %s to the offered pairing’s prompt',
    (_name, mode, configuration) => {
      expectSkippedPairingsMatch(configuration, mode);
    },
    30_000,
  );
});
