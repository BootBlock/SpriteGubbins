import type { ImageOutputConfig } from '../types/output.ts';
import type { StyleReference } from '../types/styleReference.ts';

/**
 * The settings a reference writes into the output configuration when it is chosen.
 *
 * A pure function rather than a spread at the call site, which is what the hardware profile does,
 * because one field here needs a decision the spread cannot make: `paletteLimit` is `null` on a
 * reference that pins a palette instead, and `null` is not a `PaletteLimit`. Spreading it would put
 * one into the store — past the type, since a spread of a wider object still satisfies a `Partial` —
 * and the studio's budget select would render with no matching option.
 *
 * **Dropping it is the correct answer rather than a fallback**, and it is the same reasoning that
 * keeps `paletteLimit` out of `HardwareSettings` altogether: a pinned palette supersedes the budget
 * everywhere, so there is nothing for a budget to say, and writing one would silently overwrite the
 * reader's own for when they set the palette back to `FREE`.
 */
export function styleReferencePatch(reference: StyleReference): Partial<ImageOutputConfig> {
  const { paletteLimit, ...rest } = reference.settings;
  return paletteLimit === null ? rest : { ...rest, paletteLimit };
}
