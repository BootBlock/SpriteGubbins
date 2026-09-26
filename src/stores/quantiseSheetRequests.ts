import { createRequestSequence } from '../utils/requestSequence.ts';

/**
 * The one sequence every read of a sheet into the Quantise tab is started through.
 *
 * Kept beside the store rather than in the tab, for the reason the sheet is: `App` unmounts the tab
 * on navigation, and a counter that went with it would let a decode begun before the trip land on
 * top of a sheet dropped after it. `useQuantiseStore`'s `clear` retires whatever is still decoding,
 * so a sheet never arrives after the reader has cleared it.
 */
export const quantiseSheetRequests = createRequestSequence();
