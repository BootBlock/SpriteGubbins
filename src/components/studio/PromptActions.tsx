import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { promptFileName } from '../../utils/promptFileName.ts';
import { sheetRunCount } from '../../utils/sheetBatch.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { CopyOpenNextButton } from './CopyOpenNextButton.tsx';
import { PromptActionButton } from './PromptActionButton.tsx';

interface PromptActionsProps {
  /**
   * The compiled prompt. A prop rather than another `generatePrompt` call: the panel above has
   * already derived it, and compiling it a second time here would double the work every keystroke.
   */
  readonly promptText: string;
}

/**
 * The ways to take the prompt away: as JSON, as a file, as a set of per-facing sheets, straight to
 * the clipboard, or to the clipboard and the generator with the studio stepped on to the next sheet.
 *
 * Its own component because the preview panel is the *prompt* — the rail, the counts and the text —
 * and this is a toolbar with its own handlers and its own filename rule. The combined action is a
 * component of its own, `CopyOpenNextButton`, because it keeps state about its last press. Everything but the compiled
 * text is read from the stores here rather than threaded down, so adding an action is a change to
 * this file alone.
 */
export function PromptActions({ promptText }: PromptActionsProps) {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);
  const toggleSplitModal = useUIStore((state) => state.toggleSplitModal);

  const copyText = useClipboard();
  const copyPrompt = useCopyPrompt();
  const download = useDownload();

  // Derived, not compiled: this is asked on every keystroke and only needs the number, where
  // `sheetRuns` would compile a prompt per sheet to arrive at the same figure.
  const runCount = sheetRunCount(category, subject, output);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <ControlTooltip hint="Copy JSON" text={STUDIO_ACTION_TOOLTIPS.copyJSON}>
        <PromptActionButton
          icon="{ }"
          iconClassName="font-mono"
          onClick={() => {
            void copyText(
              JSON.stringify({ category, subject, output }, null, 2),
              'JSON specification copied',
            );
          }}
        >
          Copy JSON
        </PromptActionButton>
      </ControlTooltip>

      <ControlTooltip hint="Download .md" text={STUDIO_ACTION_TOOLTIPS.downloadMarkdown}>
        <PromptActionButton
          icon="💾"
          onClick={() => {
            download(promptFileName(subject.species), promptText, 'text/markdown');
          }}
        >
          Download .md
        </PromptActionButton>
      </ControlTooltip>

      {/* Offered only when the configuration genuinely is more than one sheet, counting both axes it
          can split along: a mode covering one facing at a time over a set naming more than one, and
          a pairing whose inventory outgrew a single generation. */}
      {runCount > 1 && (
        <ControlTooltip
          hint={`Split into ${String(runCount)} sheets`}
          text={STUDIO_ACTION_TOOLTIPS.splitIntoSheets}
        >
          <PromptActionButton
            icon="🧩"
            onClick={toggleSplitModal}
            // Alone among the five in coming and going with the configuration, so it arrives rather
            // than simply being there — which is what tells the user it is new.
            className="animate-pop-in"
          >
            Split into {runCount} sheets
          </PromptActionButton>
        </ControlTooltip>
      )}

      {/* Carries the row's `ml-auto` on its wrapper, so it and Copy Prompt sit together at the
          right-hand end — the three presses it stands for finish with the copy beside it. */}
      <CopyOpenNextButton promptText={promptText} />

      <ControlTooltip hint="Copy Prompt" text={STUDIO_ACTION_TOOLTIPS.copyPrompt}>
        <button
          type="button"
          onClick={() => {
            void copyPrompt();
          }}
          // `action-tab`, not the chrome's indigo: this one belongs to the studio, and the header's
          // Copy Prompt — the same action, reachable from every view — is the one that stays primary.
          className="action-tab group relative overflow-hidden rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all duration-390 hover:scale-[1.03] active:scale-[0.98]"
        >
          {/* The sheen is a child rather than a background layer on the button, so it can be clipped
              to the rounded corners and slid across without disturbing the fill underneath. */}
          <span
            aria-hidden="true"
            className="shimmer-surface absolute inset-0 -translate-x-full transition-transform duration-1365 group-hover:translate-x-full"
          />
          <span className="relative flex items-center gap-1.5">
            <span aria-hidden="true">📋</span>
            Copy Prompt
          </span>
        </button>
      </ControlTooltip>
    </div>
  );
}
