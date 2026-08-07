import { useMemo } from 'react';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { countWords, estimateTokens, generatePrompt } from '../../utils/promptCompiler.ts';
import { DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { splitsIntoRuns } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';

/** A filename from the subject's own name, so a folder of downloads stays readable. */
function promptFileName(species: string): string {
  const stem = species
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${stem || 'sprite'}-prompt.md`;
}

/**
 * The compiled prompt, and the three ways to take it away.
 *
 * The prompt is **derived, never stored**: `useMemo` over the studio state, recomputed when that
 * state changes. Mirroring it into a `useState` through an effect is the first anti-pattern the
 * specification bans, and the one the React Compiler lint rules here would reject outright. The word
 * and token counts are computed during render without even a memo — they are a `split` and a
 * division over a string that has just been built anyway.
 *
 * That is what the cyan "auto-sync" badge is claiming, and why it is cyan: this panel is live, and
 * cyan is reserved in this palette for exactly that.
 */
export function PromptPreview() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);

  const toggleSplitModal = useUIStore((state) => state.toggleSplitModal);

  const copyText = useClipboard();
  const copyPrompt = useCopyPrompt();
  const download = useDownload();

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

        <div className="flex items-center gap-2 font-mono text-xs text-ink-faint">
          <span className="rounded-lg border border-foundry-700 bg-foundry-950/60 px-2 py-1">
            Words: <strong className="text-neon">{wordCount}</strong>
          </span>
          <span className="rounded-lg border border-foundry-700 bg-foundry-950/60 px-2 py-1">
            Est. tokens: <strong className="text-accent-soft">~{tokenEstimate}</strong>
          </span>
          <Badge tone="live">Auto-Sync</Badge>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void copyText(
              JSON.stringify({ category, subject, output }, null, 2),
              'JSON specification copied',
            );
          }}
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-foundry-700 hover:text-ink active:translate-y-0"
        >
          <span aria-hidden="true" className="font-mono">
            {'{ }'}
          </span>
          Copy JSON
        </button>

        <button
          type="button"
          onClick={() => {
            download(promptFileName(subject.species), promptText, 'text/markdown');
          }}
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-foundry-700 hover:text-ink active:translate-y-0"
        >
          <span aria-hidden="true">💾</span>
          Download .md
        </button>

        {/* Offered only when the configuration genuinely is more than one sheet — a mode covering
            one facing at a time, over a set naming more than one. */}
        {splitsIntoRuns(output) && (
          <button
            type="button"
            onClick={toggleSplitModal}
            className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            <span aria-hidden="true">🧩</span>
            Split into {DIRECTION_LISTS[output.directions].length} sheets
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            void copyPrompt();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-strong to-accent px-4 py-1.5 text-xs font-extrabold text-ink shadow-md ring-1 ring-accent-soft/30 transition-all duration-200 hover:scale-[1.03] hover:ring-accent-soft active:scale-[0.98]"
        >
          <span aria-hidden="true">📋</span>
          Copy Prompt
        </button>
      </div>

      {/* `select-all` so one click selects the whole prompt for a manual copy. */}
      <pre className="flex-1 overflow-y-auto rounded-xl border border-foundry-700 bg-foundry-950/80 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-muted shadow-inner transition-colors duration-300 select-all hover:border-neon/30">
        {promptText}
      </pre>
    </section>
  );
}
