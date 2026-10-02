import type { AspectRatio } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { supportsAspectRatio } from '../categoryAspectRatios.ts';
import type { OutputChoice } from './choices.ts';

/**
 * Every sheet canvas, with the wording the selector shows.
 *
 * Module-private, and offered only through {@link aspectRatioChoices}, the arrangement
 * `projectionChoices` has and for its reason: an unscoped list would be the one a new call site
 * reached for.
 */
const ASPECT_RATIO_LABELS: readonly OutputChoice<AspectRatio>[] = [
  { value: 'WIDE_16_9', label: 'WIDE_16_9 (recommended)' },
  { value: 'SQUARE_1_1', label: 'SQUARE_1_1' },
  { value: 'TALL_9_16', label: 'TALL_9_16' },
  { value: 'ULTRAWIDE_21_9', label: 'ULTRAWIDE_21_9' },
];

/**
 * The canvases this category's sheets can actually be drawn on — the whole list for twelve categories,
 * and `SQUARE_1_1` alone for ICON, whose four-by-four grid of square cells needs a square sheet. The
 * control still renders its one entry, since the canvas is a line the wrappers always state.
 */
export function aspectRatioChoices(category: SubjectCategory): readonly OutputChoice<AspectRatio>[] {
  return ASPECT_RATIO_LABELS.filter((choice) => supportsAspectRatio(category, choice.value));
}
