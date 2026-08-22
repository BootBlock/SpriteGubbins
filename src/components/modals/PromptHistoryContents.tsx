import { useEffect, useId, useMemo, useState } from 'react';
import { HISTORY_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { Tooltip } from '../common/Tooltip.tsx';
import { HistoryEntry } from './HistoryEntry.tsx';
import { HistoryFooter } from './HistoryFooter.tsx';

/**
 * Every prompt the user has taken away, newest first.
 *
 * A drawer rather than a centred card, because it is a list to scan alongside the studio rather than
 * a task to complete. It has no equivalent in the application being migrated — that one kept nothing
 * — so the shape here follows the specification: search, model badges, formatted timestamps, and a
 * one-click way to get an entry back.
 *
 * The table is read on open rather than held in memory for the session, so a prompt copied in another
 * tab shows up here.
 *
 * **The contents alone — the dialog frame is `AppOverlays`'.** This file is loaded on demand,
 * so the frame has to be somewhere that is already parsed when the reader presses the control
 * that opens it; `LazyOverlay` there explains what goes wrong when it is not.
 */
export function PromptHistoryContents() {
  const historyLogs = useHistoryStore((state) => state.historyLogs);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const deleteLog = useHistoryStore((state) => state.deleteLog);
  const restoreLog = useHistoryStore((state) => state.restoreLog);
  const copyText = useClipboard();

  const [query, setQuery] = useState('');
  const searchId = useId();

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return historyLogs;
    return historyLogs.filter(
      (log) =>
        log.promptText.toLowerCase().includes(needle) ||
        log.category.toLowerCase().includes(needle) ||
        log.modelUsed.toLowerCase().includes(needle),
    );
  }, [historyLogs, query]);

  return (
    <>
      <div className="border-b border-foundry-700 px-6 py-3">
        {/* The ⓘ, not a card on the field itself: this is a labelled box holding a value, which is
            what that affordance has always marked, and a card revealed by focusing a field opens
            over the list the field is filtering for as long as the caret is in it. */}
        <div className="mb-1 flex items-center gap-1.5">
          <label htmlFor={searchId} className="text-xs font-semibold text-ink-muted">
            Search prompts
          </label>
          <Tooltip text={HISTORY_ACTION_TOOLTIPS.search} hint="Search prompts" />
        </div>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Category, generator, or any words in the prompt"
          className="w-full rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-2 text-xs text-ink shadow-inner transition-colors focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <p className="shimmer-surface animate-shimmer rounded-xl p-6 text-center text-xs text-ink-faint">
            Loading prompt history…
          </p>
        ) : matches.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-6 text-center text-xs text-ink-faint">
            {historyLogs.length === 0
              ? 'Nothing here yet. Prompts are recorded when you copy them.'
              : 'No prompt matches that search.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {matches.map((log) => (
              <HistoryEntry
                key={log.id}
                log={log}
                onCopy={(entry) => {
                  void copyText(entry.promptText, 'Prompt copied to the clipboard');
                }}
                onRestore={restoreLog}
                onDelete={(entry) => {
                  void deleteLog(entry.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <HistoryFooter shownCount={matches.length} isFiltered={query.trim() !== ''} />
    </>
  );
}
