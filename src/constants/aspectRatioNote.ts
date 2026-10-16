import type { AspectRatio, TargetModelId } from '../types/output.ts';
import { requestSizeFor } from '../utils/requestSize.ts';
import { canvasDeliveryFor } from '../utils/targetCapabilities.ts';
import { ASPECT_RATIO_NOTICES } from './aspectRatioNotices.ts';
import { ASPECT_RATIO_TERMS } from './aspectRatioTerms.ts';

/**
 * What the Aspect Ratio control says under itself, or `''` where it has nothing to add: the size to
 * request on a target whose request, rather than its prompt, decides the canvas.
 *
 * Shown under the control, so it is plain text rather than card markup, as the Background Key
 * control's note is.
 */
export function aspectRatioNote(target: TargetModelId, aspectRatio: AspectRatio): string {
  const canvas = canvasDeliveryFor(target);
  if (canvas.kind === 'PROMPT') return '';
  const size = requestSizeFor(ASPECT_RATIO_TERMS[aspectRatio], canvas.limits);
  return size === null
    ? ASPECT_RATIO_NOTICES.none(canvas.parameter)
    : ASPECT_RATIO_NOTICES.size(canvas.parameter, size.width, size.height);
}
