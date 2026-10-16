/**
 * What the Aspect Ratio control says under itself on a target whose request, rather than its prompt,
 * decides the canvas. `aspectRatioNote` chooses which, and the guidance suite reads both wordings.
 */
export const ASPECT_RATIO_NOTICES = {
  /** The size, written as the request option takes it, to set for the chosen canvas. */
  size: (parameter: string, width: number, height: number): string =>
    `This target draws the canvas your request’s ${parameter} option sets, whatever the prompt says. Set ${parameter} to “${String(width)}x${String(height)}”, the largest canvas of this shape it supports before its sizes turn experimental.`,

  /** Where no size short of the experimental ones is the chosen canvas's shape. */
  none: (parameter: string): string =>
    `This target draws the canvas your request’s ${parameter} option sets, whatever the prompt says, and no ${parameter} it supports before its sizes turn experimental is this shape, so choose another canvas.`,
} as const;
