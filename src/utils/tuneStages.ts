import { TUNE_ALIAS_STAGES } from './tuneAliasStages.ts';
import { TUNE_CELL_STAGES } from './tuneCellStages.ts';
import type { TuneStage } from './tuneStage.ts';

/**
 * The sweep, as a staged coordinate descent rather than one grid over every dial at once.
 *
 * **A full grid is not available at any resolution worth having.** Twelve dials at five positions
 * each is a quarter of a billion candidates, and each one runs the whole pipeline over five crops.
 * Coordinate descent is what makes the search affordable: each stage sweeps its own axes fully, from
 * the dials every earlier stage settled, so the cost is the *sum* of the stages rather than their
 * product — 145 positions a round on the branch that skips nothing, against a number with nine digits
 * in it. `constants/autoTune.ts` carries that arithmetic in full.
 *
 * **The order is the pipeline's own, and it is what makes the descent sound.** A coordinate descent
 * is only as good as the order it descends in, because a stage cannot revisit what an earlier one
 * chose *within a round*. Here the earlier dial is always the one the later dial's effect depends on:
 * which reading turns the mesh into pixels decides what the ink blend has to work with, the ink blend
 * decides what colours exist for the merge to fold, the merge decides what the cleanup finds to snap,
 * and every one of those decides what staircases the anti-aliasing pass has to reconstruct. Sweeping
 * the cleanup before the reading would tune a pass against colours the reading is about to replace.
 *
 * **What the order cannot do is settle a dial against the ones behind it, and that is what the rounds
 * are for.** The reading is chosen in round one against a merge and a cleanup still at their opening
 * positions; round two chooses it again against the positions round one settled them at. See
 * `TUNE_ROUNDS` for why eight, and `autoTune` for why the sweep stops on a round that ends anywhere
 * it has already stood rather than on one that moves nothing.
 *
 * **A stage skipped in the last round hands its own dials back**, which is a thing rounds made
 * necessary: a stage that swept under one reading and is skipped because a later round moved off it
 * would otherwise leave the reader positions chosen in a branch the sweep abandoned. That is what
 * `TuneStage.dials` is for, and `autoTune` carries the argument.
 *
 * **Five of the nine stages can find themselves with nothing to do, and they say so rather than
 * sweeping anyway.** The two files this list is composed from carry which and why: the ink dials are
 * read only by `INK_WEIGHTED` and the passes dial only where the fill cleanup is on, and all three
 * anti-aliasing stages reach nothing while that control is `OFF`.
 *
 * **Where a stage's own ladder starts is not what decides a tie** — `withIncumbent` is. See the note
 * there: a ladder is a set of positions worth trying, and making its *first* entry carry the
 * tie-breaking contract as well was a coincidence that two of the seven ladders did not honour.
 */
export const TUNE_STAGES: readonly TuneStage[] = [...TUNE_CELL_STAGES, ...TUNE_ALIAS_STAGES];
