import type { RenderStyle } from '../../types/rendering.ts';

/** The verb a sentence of guidance gives a list of styles: `offers` for one, `offer` for several. */
export function verb(styles: readonly RenderStyle[], singular: string, plural: string): string {
  return styles.length === 1 ? singular : plural;
}
