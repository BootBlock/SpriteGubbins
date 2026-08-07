import { useCallback } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { useHistoryStore } from '../stores/useHistoryStore.ts';
import { countWords, generatePrompt } from '../utils/promptCompiler.ts';
import { useClipboard } from './useClipboard.ts';

/**
 * Taking the prompt away: compile it, copy it, and record that it was taken.
 *
 * Shared because two places offer it — the header's primary call to action and the preview's own
 * button — and copying without logging in one of them would leave the history quietly incomplete.
 *
 * The studio state is read with `getState()` at click time rather than subscribed to. That is the
 * point of the hook: the header offers this button but must not re-render on every keystroke in the
 * subject form, which an atomic selector over `subject` would make it do.
 *
 * Nothing is logged when the copy fails. The history is a record of prompts the user actually took
 * away, so an entry for a prompt that never reached the clipboard would be a false one.
 */
export function useCopyPrompt(): () => Promise<void> {
  const copyText = useClipboard();
  const addLog = useHistoryStore((state) => state.addLog);

  return useCallback(async () => {
    const { category, subject } = useSubjectStore.getState();
    const { output } = useOutputStore.getState();
    const promptText = generatePrompt(category, subject, output);

    const copied = await copyText(promptText, 'Prompt copied to the clipboard');
    if (!copied) return;

    await addLog({
      category,
      promptText,
      wordCount: countWords(promptText),
      modelUsed: output.targetModel,
    });
  }, [copyText, addLog]);
}
