import { createRequestSequence } from '../utils/requestSequence.ts';

/**
 * The one sequence every read of a sheet into the identity lock's palette is started through.
 *
 * Taking the quantised sheet retires a file still decoding, because pressing the button is a later
 * choice than the file was, and so does a wholesale write that replaces the lock
 * (`retireOverwrittenReads`). Typing in the lock does not: the capture reads the lock when it lands,
 * so what the reader typed is kept. Beside the stores rather than in `useIdentityPaletteCapture`, because
 * the lock outlives the panel that reads into it.
 */
export const identityPaletteRequests = createRequestSequence();
