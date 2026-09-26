import type { QuantisePrologue, QuantiseSettings } from '../types/quantiser.ts';
import { quantisePrologue } from './quantisePrologue.ts';
import { ssimReference, type SsimReference } from './ssim.ts';

/**
 * One crop as the sweep reads it: what every candidate is run from, and what every one is scored
 * against.
 *
 * **Both halves depend on the crop and on nothing the sweep moves**, which is why they are built
 * together, once a crop, before the first candidate runs. The prologue's three inputs — `key`,
 * `silhouetteThreshold` and `grid` — are not in `TunedDials`, and the reference is built from
 * the prologue's own image. See `quantisePrologue` for the first and `ssimReference` for the second.
 */
export interface TuneCrop {
  readonly prologue: QuantisePrologue;
  /** {@link QuantisePrologue.source}, measured for the likeness score — see `ssimAgainst`. */
  readonly reference: SsimReference;
}

/** A crop measured for the sweep — see {@link TuneCrop}. */
export function tuneCrop(image: ImageData, settings: QuantiseSettings): TuneCrop {
  const prologue = quantisePrologue(image, settings);
  return { prologue, reference: ssimReference(prologue.source) };
}
