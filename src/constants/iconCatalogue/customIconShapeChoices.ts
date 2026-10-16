import { CUSTOM_ICON_FAMILY_SIZE } from './customIconLimits.ts';
import { CUSTOM_ICON_SHAPES } from '../../types/customIconFormValues.ts';
import type { CustomIconShape } from '../../types/customIconFormValues.ts';

/** Each shape as the form's *Drawn as* control offers it. */
const SHAPE_LABELS: Readonly<Record<CustomIconShape, string>> = {
  ONE: 'One icon',
  STATES: 'Two states of one icon',
  VARIANTS: `A family of ${String(CUSTOM_ICON_FAMILY_SIZE.fewest)} to ${String(CUSTOM_ICON_FAMILY_SIZE.most)} variants`,
};

/** One shape as an option of the select. */
interface CustomIconShapeChoice {
  readonly value: CustomIconShape;
  readonly label: string;
}

/** Every shape an icon of the reader's own can take, in the control's order. */
export const CUSTOM_ICON_SHAPE_CHOICES: readonly CustomIconShapeChoice[] = CUSTOM_ICON_SHAPES.map(
  (shape) => ({ value: shape, label: SHAPE_LABELS[shape] }),
);
