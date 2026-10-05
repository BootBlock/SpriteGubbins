import type { AnatomyComponent } from './anatomy.ts';
import type { ComponentEntry, ComponentGroup } from './components.ts';

/**
 * One line of an icon set's overlay run, with the group it is listed under: a line of the look's library,
 * or one of the reader's *Extra Overlay Pieces*, which carries the `piece` it was written from so the cut
 * can lay its drawings across sheets (`overlayRuns`).
 */
export interface OverlayLine {
  readonly group: ComponentGroup;
  readonly entry: ComponentEntry;
  readonly count: number;
  readonly piece?: AnatomyComponent;
}
