import { useMemo } from 'react';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { countWords, estimateTokens, generatePrompt } from '../../utils/promptCompiler.ts';
import { Badge } from '../common/Badge.tsx';
import { PromptActions } from './PromptActions.tsx';
import { PromptBudgetNotice } from './PromptBudgetNotice.tsx';

/**
 * The compiled prompt, and how much of it there is.
 *
 * The prompt is **derived, never stored**: `useMemo` over the studio state, recomputed when that
 * state changes. Mirroring it into a `useState` through an effect is the first anti-pattern the
 * specification bans, and the one the React Compiler lint rules here would reject outright. The word
 * and token counts are computed during render without even a memo — they are a `split` and a
 * division over a string that has just been built anyway.
 *
 * That is what the cyan "auto-sync" badge is claiming, and why it is cyan: this panel is live, and
 * cyan is reserved in this palette for exactly that.
 *
 * The ways of taking the prompt away are {@link PromptActions}, which reads the same state from the
 * stores itself — this panel hands it only the compiled text, so the prompt is built once.
 */
export function PromptPreview() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);

  const promptText = useMemo(() => generatePrompt(category, subject, output), [category, subject, output]);
  const wordCount = countWords(promptText);
  const tokenEstimate = estimateTokens(promptText);

  return (
    <section className="animate-fade-in glass-panel relative flex max-h-[36rem] flex-col overflow-hidden rounded-2xl border border-foundry-700 p-5 shadow-2xl">
      {/*
        The live rail: a cyan highlight travelling the panel's top edge for as long as the compiler
        is watching the studio. Cyan rather than indigo because that is precisely the claim it makes,
        and it stops the moment a user has asked their OS for less motion.
      */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <span className="animate-scan-beam absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-neon to-transparent" />
      </span>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span aria-hidden="true" className="animate-pulse-glow size-2.5 rounded-full bg-neon" />
          <span className="font-semibold tracking-wide text-neon">Realtime compiler active</span>
        </div>

        {/*
          `tabular-nums` on both counters: these change on almost every keystroke, and proportional
          digits would shuffle the chip's width — and the badge beside it — with each one.
        */}
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-ink-faint">
          <span className="rounded-lg border border-foundry-700 bg-foundry-950/60 px-2 py-1 transition-colors duration-300 hover:border-neon/40">
            Words: <strong className="text-neon">{wordCount}</strong>
          </span>
          <span className="rounded-lg border border-foundry-700 bg-foundry-950/60 px-2 py-1 transition-colors duration-300 hover:border-accent/40">
            Est. tokens: <strong className="text-accent-soft">~{tokenEstimate}</strong>
          </span>
          <Badge tone="live">Auto-Sync</Badge>
        </div>
      </div>

      <PromptBudgetNotice prompt={promptText} />

      <PromptActions promptText={promptText} />

      {/* `select-all` so one click selects the whole prompt for a manual copy. */}
      <pre className="flex-1 overflow-y-auto rounded-xl border border-foundry-700 bg-foundry-950/80 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-muted shadow-inner transition-colors duration-300 select-all hover:border-neon/30">
        {promptText}
      </pre>
    </section>
  );
}
