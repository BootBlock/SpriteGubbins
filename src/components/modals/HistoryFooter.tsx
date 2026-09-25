import { HISTORY_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useConfirmInPlace } from '../../hooks/useConfirmInPlace.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Button } from '../common/Button.tsx';

/** The filename an exported history arrives as, alongside the preset pack's. */
const HISTORY_FILENAME = 'sprite-gubbins-history.json';

interface HistoryFooterProps {
  /** How many entries the search is currently showing. */
  readonly shownCount: number;
  /** Whether a search is narrowing the list, so the count can say so. */
  readonly isFiltered: boolean;
}

/**
 * What can be done to the history as a whole: count it, take it away, or destroy it.
 *
 * Its own file because the drawer above it was at the 150-line mark, and because these are the
 * collection-wide actions — the per-entry ones live on `HistoryEntry`. The search query is the
 * drawer's own view state, so the two counts arrive as props while everything else comes from the
 * store directly.
 *
 * **This is the confirmation with nowhere of its own to give the keyboard back to.** Both of its
 * buttons are `disabled` the moment the collection they act on is empty, so a reader who answers
 * "Delete everything" from the keyboard cannot be returned to either — which is why
 * {@link useConfirmInPlace} chooses the destination by asking where the next Tab would have gone
 * rather than by aiming at a control this component names. Emptied, that is the drawer's search box,
 * which is the first thing left in the dialog.
 */
export function HistoryFooter({ shownCount, isFiltered }: HistoryFooterProps) {
  const historyLogs = useHistoryStore((state) => state.historyLogs);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const exportHistoryJSON = useHistoryStore((state) => state.exportHistoryJSON);
  const download = useDownload();

  const { isConfirming, attachAsk, attachCancel, ask, cancel, confirm } = useConfirmInPlace();
  const isEmpty = historyLogs.length === 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foundry-700 px-6 py-4">
      <span className="font-mono text-2xs text-ink-faint">
        {historyLogs.length} recorded{isFiltered && ` · ${shownCount} shown`}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          Exports the whole history, not the filtered view — the store owns that distinction. This
          is the only way the one collection the user cannot rebuild leaves the app, which is why
          it sits beside the action that destroys it.
        */}
        <ControlTooltip hint="Export history" text={HISTORY_ACTION_TOOLTIPS.exportHistory}>
          <Button
            variant="secondary"
            size="md"
            disabled={isEmpty}
            onClick={() => {
              download(HISTORY_FILENAME, exportHistoryJSON(), 'application/json');
            }}
          >
            <span aria-hidden="true">📤</span> Export history (JSON)
          </Button>
        </ControlTooltip>

        {/* Two presses to clear. The history is the only thing in this app the user cannot rebuild
            from what is on screen, so the destructive action asks first. */}
        {isConfirming ? (
          <span className="flex items-center gap-2">
            <ControlTooltip hint="Delete everything" text={HISTORY_ACTION_TOOLTIPS.confirmClearHistory}>
              <Button
                variant="destructive"
                size="md"
                onClick={() => {
                  void confirm(clearHistory);
                }}
              >
                Delete everything
              </Button>
            </ControlTooltip>
            <ControlTooltip hint="Cancel" text={HISTORY_ACTION_TOOLTIPS.cancelClearHistory}>
              <Button variant="secondary" size="md" ref={attachCancel} onClick={cancel}>
                Cancel
              </Button>
            </ControlTooltip>
          </span>
        ) : (
          <ControlTooltip hint="Clear history" text={HISTORY_ACTION_TOOLTIPS.clearHistory}>
            <Button variant="danger" size="md" ref={attachAsk} disabled={isEmpty} onClick={ask}>
              Clear history
            </Button>
          </ControlTooltip>
        )}
      </div>
    </div>
  );
}
