import type { Rgba } from '../types/quantiser.ts';
import { identityPalette } from './identityPalette.ts';
import { imagePalette, reduceImagePalette } from './imagePalette.ts';

/**
 * The three questions the studio asks of a picture's colours, as one job a thread can be handed.
 *
 * Each is a walk over every pixel, and two of them run the quantiser: on a 4096² sheet a reduction
 * took 8.8 seconds and an identity reading 0.6, which on the tab's own thread is a frozen page. So
 * `paletteReadWorker` runs them, and this is what it runs. **The job decides which reading it gets
 * here rather than in the worker**, as `writeSheet` decides a file's format for its own thread: a
 * branch inside a worker is a branch nothing can test without one.
 *
 * - `swatch` reads a picture of a palette in the author's order, or `null` past `max` — see
 *   {@link imagePalette}.
 * - `reduce` brings a picture down to `max` colours it already holds — see
 *   {@link reduceImagePalette}.
 * - `identity` reads a sheet's dominant colours with its key field left out — see
 *   {@link identityPalette}.
 */
export type PaletteReadJob =
  | { readonly kind: 'swatch'; readonly image: ImageData; readonly max: number }
  | { readonly kind: 'reduce'; readonly image: ImageData; readonly max: number }
  | { readonly kind: 'identity'; readonly image: ImageData; readonly backgroundKey: Rgba | null };

/**
 * What each job answers: a list of `#RRGGBB`, and for `swatch` alone, `null` where the picture holds
 * more colours than a palette may carry. Stated per job so a caller asking for a reduction is never
 * handed a `null` its question cannot produce.
 */
export type PaletteReadAnswer<Job extends PaletteReadJob> = Job extends { readonly kind: 'swatch' }
  ? readonly string[] | null
  : readonly string[];

export function readPalette(job: PaletteReadJob): readonly string[] | null {
  switch (job.kind) {
    case 'swatch':
      return imagePalette(job.image, job.max);
    case 'reduce':
      return reduceImagePalette(job.image, job.max);
    case 'identity':
      return identityPalette(job.image, job.backgroundKey);
  }
}
