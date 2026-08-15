import { useEffect, useMemo } from 'react';
import { useHistoryStore } from '../stores/useHistoryStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { OutputConfig } from '../types/output.ts';
import { sheetIdentity } from '../utils/sheetRuns.ts';

/**
 * Which sheets of this subject's batch have already been taken away — asked of one configuration at
 * a time.
 *
 * **"Copied" already has a durable meaning in this app, which is that the prompt is in the history**,
 * and that is what makes this answer survive the workflow it exists to serve: §5 advises writing the
 * identity lock from the first sheet you accept, so the user is *expected* to leave mid-batch, change
 * a setting, and come back — at which point a `useState` of copied sheets has forgotten all of it, and
 * a session that started yesterday has nothing at all.
 *
 * Matching is by {@link sheetIdentity} rather than by prompt text, for the second half of the same
 * reason: adding that identity lock rewrites every sheet's text, so a text match would have wiped the
 * progress at exactly the moment the advice was followed.
 *
 * **The history is read here rather than at each call site**, because two places now ask this — the
 * studio's batch strip and the split drawer — and a caller that forgot the read would report a
 * batch begun in an earlier session as untouched. The read is the same one the history drawer does on
 * open; failures raise a toast inside the store rather than surfacing here, so a database that will
 * not answer costs the marks on screen and nothing else.
 */
export function useCopiedSheets(): (output: OutputConfig) => boolean {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const historyLogs = useHistoryStore((state) => state.historyLogs);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Keyed over the whole history once rather than re-derived per question: a batch is ten sheets and
  // the history is a hundred entries, so the alternative is a thousand identity strings per render.
  const takenAway = useMemo(
    () => new Set(historyLogs.map((log) => sheetIdentity(log.category, log.subject, log.output))),
    [historyLogs],
  );

  return (output) => takenAway.has(sheetIdentity(category, subject, output));
}
