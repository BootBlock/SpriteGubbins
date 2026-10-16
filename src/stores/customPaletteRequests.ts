import { createRequestSequence } from '../utils/requestSequence.ts';

/**
 * The one sequence every read of a file into the custom palette is started through.
 *
 * One for both routes, the image and the text, because they write the same field: a large PNG
 * chosen and then a `.gpl` would otherwise pin whichever finished last. A paste, a reduction,
 * Clear and a wholesale write that replaces the palette (`retireOverwrittenReads`) retire whatever
 * is still being read, as later choices than it. Beside the stores rather than in
 * `useCustomPaletteIntake`, because the palette outlives the panel that reads into it.
 */
export const customPaletteRequests = createRequestSequence();
