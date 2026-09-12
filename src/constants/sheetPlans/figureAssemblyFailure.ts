import type { AssemblyFailure } from '../../types/components.ts';

/**
 * How every CHARACTER and CREATURE sheet forbids its assembled whole, in the three sections that say it.
 *
 * The wording that shipped, unchanged: the figure vocabulary is what these forms were first written in,
 * and it was always right for these two categories. A creature is a figure for a generator's purposes
 * — the parts joined into one body, and that body doing something — so the two share one failure, and
 * stating it once is what keeps the pair from drifting apart when one of them is reworded.
 *
 * Every sheet of both takes it, because each draws the pieces of one body and none draws the body: a
 * pose library's limb variants, a directional core's trunk, an articulation run's limbs and a rig's
 * rest-pose segments all fail the same way, as the pieces joined back into the figure.
 */
export const FIGURE_ASSEMBLY_FAILURE: AssemblyFailure = {
  instruction: 'Do not draw an assembled figure anywhere on the sheet, including as a reference or key.',
  exclusion: 'Assembled or posed complete figures.',
  audit: 'nothing on the sheet is an assembled or part-assembled figure',
};
