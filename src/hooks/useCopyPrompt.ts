import { useCallback } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { useHistoryStore } from '../stores/useHistoryStore.ts';
import { countWords, generatePrompt } from '../utils/promptCompiler.ts';
import { sheetBatch } from '../utils/sheetBatch.ts';
import { sheetCoverage } from '../utils/sheetCoverage.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import type { SheetRun } from '../utils/sheetRuns.ts';
import { useClipboard } from './useClipboard.ts';

/**
 * What the confirmation says, which for a batch has to be *which sheet* rather than that something
 * was copied.
 *
 * Derived from the configuration actually being copied, so it answers for both callers with one
 * rule: the split drawer hands in a run whose configuration names its own sheet, and the studio's
 * own button hands in nothing and is asking about the sheet it is currently on. A single-sheet
 * configuration has no position to report and says the plain thing instead — a "sheet 1 of 1" is a
 * count nobody was keeping.
 */
function copyConfirmation(category: SubjectCategory, output: OutputConfig): string {
  const { sheets, ordinal } = sheetBatch(category, output);
  const sheet = sheets[ordinal - 1];
  if (sheets.length < 2 || sheet === undefined) return 'Prompt copied to the clipboard';

  return `Copied sheet ${String(ordinal)} of ${String(sheets.length)} — ${sheet.plan.name} · ${sheetCoverage(sheet)}`;
}

/**
 * Taking a prompt away: compile it, copy it, and record that it was taken.
 *
 * Shared because three places offer it — the header's primary call to action, the preview's own
 * button, and the sheet splitter, once per run — and copying without logging in any of them would
 * leave the history quietly incomplete.
 *
 * The studio state is read with `getState()` at click time rather than subscribed to. That is the
 * point of the hook: the header offers this button but must not re-render on every keystroke in the
 * subject form, which an atomic selector over `subject` would make it do.
 *
 * Nothing is logged when the copy fails. The history is a record of prompts the user actually took
 * away, so an entry for a prompt that never reached the clipboard would be a false one.
 *
 * **The confirmation names the sheet wherever there is more than one**, through
 * {@link copyConfirmation} — the header's button and the preview's are reachable mid-batch, and
 * "Prompt copied to the clipboard" is no answer at all to which of ten prompts just went.
 *
 * @param run one sheet of a split, or omitted for whatever the studio currently compiles to. A run
 * carries its own configuration as well as its own text, so the entry it logs restores to *that*
 * sheet — its facing and its place in the plan's series both — where an entry holding the batch's
 * configuration would come back as run one whatever prompt it showed.
 */
export function useCopyPrompt(): (run?: SheetRun) => Promise<void> {
  const copyText = useClipboard();
  const addLog = useHistoryStore((state) => state.addLog);

  return useCallback(
    async (run) => {
      const { category, subject } = useSubjectStore.getState();
      const output = run?.output ?? useOutputStore.getState().output;
      const promptText = run?.promptText ?? generatePrompt(category, subject, output);

      const copied = await copyText(promptText, copyConfirmation(category, output));
      if (!copied) return;

      // The subject and output travel with the prompt, not just the text they produced: the compiled
      // prompt is a one-way rendering of them, so this is the only moment the studio state that made
      // it can be captured, and without it the entry could never be restored.
      await addLog({
        category,
        promptText,
        wordCount: countWords(promptText),
        modelUsed: output.targetModel,
        subject,
        output,
      });
    },
    [copyText, addLog],
  );
}
