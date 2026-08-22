import { STUDIO_HISTORY_GUIDANCE } from '../../constants/studioHistory.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { canRedoStudio, canUndoStudio, studioUndoDepth } from '../../utils/studioHistory.ts';
import { HistoryControls } from '../common/HistoryControls.tsx';

/**
 * Stepping the subject back through the positions it has been in, and forward again.
 *
 * Above the Subject Definition panel rather than inside its header: what it steps back is not only
 * the sixteen answers but the output settings a category switch moved with them, so it governs both
 * numbered panels below it. It is also where the reason to reach for it arrives — a category select
 * opened to read the other options and closed on the wrong one.
 *
 * The surface, the two buttons and the keyboard shortcut are `HistoryControls`, which the Quantise
 * tab's dial stack shares.
 */
export function SubjectHistoryControls() {
  const history = useSubjectStore((state) => state.history);
  const undo = useSubjectStore((state) => state.undoStudio);
  const redo = useSubjectStore((state) => state.redoStudio);

  return (
    <HistoryControls
      label="Subject history"
      stepsBack={studioUndoDepth(history)}
      canRedo={canRedoStudio(history)}
      undo={undo}
      redo={redo}
      undoTooltip={STUDIO_ACTION_TOOLTIPS.undoSubject}
      redoTooltip={STUDIO_ACTION_TOOLTIPS.redoSubject}
      guidance={canUndoStudio(history) ? STUDIO_HISTORY_GUIDANCE.available : STUDIO_HISTORY_GUIDANCE.open}
    />
  );
}
