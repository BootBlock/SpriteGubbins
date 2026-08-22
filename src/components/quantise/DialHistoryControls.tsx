import { DIAL_HISTORY_GUIDANCE } from '../../constants/dialHistory.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { canRedoDials, canUndoDials, undoDepth } from '../../utils/dialHistory.ts';
import { HistoryControls } from '../common/HistoryControls.tsx';

/**
 * Stepping the dials back through the positions they have been in, and forward again.
 *
 * Above the dials rather than below them, and the first panel after the drop zone: it governs every
 * control on the tab, and the reason to reach for it — having just moved something and lost the
 * position it was at — arrives while looking at the sliders it sits over.
 *
 * The counts are derived from the store's history during render rather than kept beside it, which is
 * the app's rule for anything a `useState` and an effect would otherwise chase. This panel subscribes
 * to the history itself rather than to a count, because that is the one value here whose identity
 * genuinely changes on every dial edit — this is the panel the flat dial fields exist to keep every
 * *other* one from having to do that.
 *
 * The surface, the two buttons and the keyboard shortcut are `HistoryControls`, which the Studio's
 * own stack shares. What is left here is the reading of *this* stack.
 */
export function DialHistoryControls() {
  const history = useQuantiseStore((state) => state.history);
  const undo = useQuantiseStore((state) => state.undo);
  const redo = useQuantiseStore((state) => state.redo);

  return (
    <HistoryControls
      label="Dial history"
      stepsBack={undoDepth(history)}
      canRedo={canRedoDials(history)}
      undo={undo}
      redo={redo}
      undoTooltip={QUANTISE_ACTION_TOOLTIPS.undoDials}
      redoTooltip={QUANTISE_ACTION_TOOLTIPS.redoDials}
      guidance={canUndoDials(history) ? DIAL_HISTORY_GUIDANCE.available : DIAL_HISTORY_GUIDANCE.open}
    />
  );
}
