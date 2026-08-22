import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { PixelGrid, SheetScale } from '../../types/quantiser.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface GridCandidatesProps {
  /** What the sheet itself was read as, exactly or as an estimate, or `null` for neither. */
  readonly scale: SheetScale | null;
  /** The scale the studio's target component size implies, or `null` where it implies none. */
  readonly suggested: PixelGrid | null;
  readonly onChoose: (grid: PixelGrid) => void;
}

const CANDIDATE_CLASS =
  'rounded-lg border border-foundry-600 bg-foundry-700 px-2.5 py-1 font-mono text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-600 hover:text-ink';

/**
 * The scales worth trying first, each labelled with where it came from.
 *
 * **Every one of these is a candidate rather than a default**, which is why they are buttons and not
 * a value the box opens with. They reach it by three different routes and are worth different
 * amounts: an `EXACT` reading is already in the box, so its button is the way back after the user
 * has typed over it; an estimate is read through the resampling that destroyed the sheet's edges
 * and is *never* adopted on its own, so this row is the only place it is reachable at all;
 * and the target size is an upper bound derived from how many components the sheet has to seat,
 * which is not a measurement of this image in the first place.
 *
 * Saying which is which is the whole job. A row of bare numbers would let the one that carries a
 * tolerance be clicked as though it were the one that does not. Which of the three estimates
 * answered is not said here — the button has one word of room, and the badge above it names the
 * reading in full.
 */
export function GridCandidates({ scale, suggested, onChoose }: GridCandidatesProps) {
  if (scale === null && suggested === null) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-ink-muted">Try</span>
      {scale !== null && (
        <ControlTooltip
          hint={scale.measurement === 'EXACT' ? 'Measured scale' : 'Estimated scale'}
          text={QUANTISE_ACTION_TOOLTIPS.candidateFromSheet}
        >
          <button
            type="button"
            onClick={() => {
              onChoose(scale.grid);
            }}
            className={CANDIDATE_CLASS}
          >
            {scale.grid}× {scale.measurement === 'EXACT' ? 'measured' : 'estimated'}
          </button>
        </ControlTooltip>
      )}
      {suggested !== null && (
        <ControlTooltip hint="Scale from the target size" text={QUANTISE_ACTION_TOOLTIPS.candidateFromTarget}>
          <button
            type="button"
            onClick={() => {
              onChoose(suggested);
            }}
            className={CANDIDATE_CLASS}
          >
            {suggested}× from the target size
          </button>
        </ControlTooltip>
      )}
    </div>
  );
}
