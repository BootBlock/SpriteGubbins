import type { SheetWriteJob } from '../utils/writeSheet.ts';
import { createImage } from '../utils/imageData.ts';

/**
 * A download job with everything filled in, for the suites that are not testing the payload.
 *
 * `writeSheetOffThread` and the worker around it are about *settling* — a thread per press, seven
 * ways out, a flag that must not be left set — and every one of those walks needs a job to send
 * without caring what is in it. Spelling all nine fields at each of them would make a field added
 * to the job a dozen edits in files that have nothing to say about it, which is exactly the kind of
 * mechanical churn that gets a default wrong somewhere in the middle.
 *
 * The defaults describe the plainest download there is: a small opaque sheet, at its own size, as a
 * PNG, cut at the bounding boxes, with nothing found on it and no studio configuration behind it. Anything a test is actually
 * about is passed in and overrides its default.
 */
export function sheetWriteJob(overrides: Partial<SheetWriteJob> = {}): SheetWriteJob {
  return {
    image: createImage(2, 2),
    scale: 1,
    format: 'PNG',
    boxes: [],
    cell: null,
    duplicates: [],
    names: [],
    imageName: 'sheet-quantised.png',
    sheet: null,
    facing: null,
    ...overrides,
  };
}
