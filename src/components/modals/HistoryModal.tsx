import { useEffect, useId, useMemo, useState } from 'react';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Modal } from '../common/Modal.tsx';
import { HistoryEntry } from './HistoryEntry.tsx';

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
 */
export function HistoryModal() {
  const historyLogs = useHistoryStore((state) => state.historyLogs);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const restoreLog = useHistoryStore((state) => state.restoreLog);
  const toggleHistoryModal = useUIStore((state) => state.toggleHistoryModal);
  const copyText = useClipboard();

  const [query, setQuery] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
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
    <Modal
      title="Prompt History"
      icon="🕓"
      onClose={toggleHistoryModal}
      panelClassName="ml-auto flex h-full w-full max-w-md flex-col self-stretch overflow-hidden rounded-2xl border border-foundry-700 bg-foundry-800 shadow-2xl"
    >
      <div className="border-b border-foundry-700 px-6 py-3">
        <label htmlFor={searchId} className="mb-1 block text-xs font-semibold text-ink-muted">
          Search prompts
        </label>
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
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-foundry-700 px-6 py-4">
        <span className="font-mono text-[10px] text-ink-faint">
          {historyLogs.length} recorded{query.trim() && ` · ${matches.length} shown`}
        </span>

        {/* Two presses to clear. The history is the only thing in this app the user cannot rebuild
            from what is on screen, so the destructive action asks first. */}
        {isConfirmingClear ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirmingClear(false);
                void clearHistory();
              }}
              className="rounded-lg bg-rose px-3 py-1.5 text-[11px] font-bold text-foundry-950 transition-opacity hover:opacity-90"
            >
              Delete everything
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingClear(false);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={historyLogs.length === 0}
            onClick={() => {
              setIsConfirmingClear(true);
            }}
            className="rounded-lg border border-foundry-600 px-3 py-1.5 text-[11px] font-semibold text-rose transition-colors hover:bg-foundry-700 disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent"
          >
            Clear history
          </button>
        )}
      </div>
    </Modal>
  );
}
