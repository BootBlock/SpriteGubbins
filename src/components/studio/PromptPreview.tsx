import { useMemo } from 'react';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { countWords, estimateTokens, generatePrompt } from '../../utils/promptCompiler.ts';
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

  const copyText = useClipboard();
  const copyPrompt = useCopyPrompt();
  const download = useDownload();

  const promptText = useMemo(() => generatePrompt(category, subject, output), [category, subject, output]);
  const wordCount = countWords(promptText);
  const tokenEstimate = estimateTokens(promptText);

  return (
    <section className="animate-fade-in flex max-h-[36rem] flex-col rounded-2xl border border-foundry-700 bg-foundry-800/90 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span aria-hidden="true" className="animate-pulse-glow size-2.5 rounded-full bg-neon" />
          <span className="font-semibold tracking-wide text-neon">Realtime compiler active</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-ink-faint">
          <span>
            Words: <strong className="text-neon">{wordCount}</strong>
          </span>
          <span>
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
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
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
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
        >
          <span aria-hidden="true">💾</span>
          Download .md
        </button>

        <button
          type="button"
          onClick={() => {
            void copyPrompt();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-accent-strong px-4 py-1.5 text-xs font-extrabold text-ink shadow-md transition-colors hover:bg-accent"
        >
          <span aria-hidden="true">📋</span>
          Copy Prompt
        </button>
      </div>

      {/* `select-all` so one click selects the whole prompt for a manual copy. */}
      <pre className="flex-1 overflow-y-auto rounded-xl border border-foundry-700 bg-foundry-950 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-muted shadow-inner select-all">
        {promptText}
      </pre>
    </section>
  );
}
