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

/**
 * Geometry and motion for the three secondary actions, so the set stays matched.
 *
 * One string rather than one per button: they sit side by side, so a difference between any two of
 * them reads as a mistake rather than as emphasis.
 *
 * The hover border is the view's colour, matching the chrome's own secondary pair and the primary
 * beside them: every button inside a panel now answers to `--color-tab`, and one of the four still
 * lighting up indigo would read as belonging to something else.
 */
const PROMPT_ACTION =
  'group flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-390 hover:-translate-y-px hover:border-tab/50 hover:bg-foundry-700 hover:text-ink active:translate-y-0';

/** The glyph inside one of those, lifting with it — which is why each button is a `group`. */
const PROMPT_ACTION_ICON = 'inline-block transition-transform duration-585 group-hover:scale-125';

interface PromptActionsProps {
  /**
   * The compiled prompt. A prop rather than another `generatePrompt` call: the panel above has
   * already derived it, and compiling it a second time here would double the work every keystroke.
   */
  readonly promptText: string;
}

/**
 * The four ways to take the prompt away: as JSON, as a file, as a set of per-facing sheets, or
 * straight to the clipboard.
 *
 * Its own component because the preview panel is the *prompt* — the rail, the counts and the text —
 * and this is a toolbar with four handlers and its own filename rule. Everything but the compiled
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
  const runCount = sheetRunCount(category, output);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <ControlTooltip hint="Copy JSON" text={STUDIO_ACTION_TOOLTIPS.copyJSON}>
        <button
          type="button"
          onClick={() => {
            void copyText(
              JSON.stringify({ category, subject, output }, null, 2),
              'JSON specification copied',
            );
          }}
          className={PROMPT_ACTION}
        >
          <span aria-hidden="true" className={`${PROMPT_ACTION_ICON} font-mono`}>
            {'{ }'}
          </span>
          Copy JSON
        </button>
      </ControlTooltip>

      <ControlTooltip hint="Download .md" text={STUDIO_ACTION_TOOLTIPS.downloadMarkdown}>
        <button
          type="button"
          onClick={() => {
            download(promptFileName(subject.species), promptText, 'text/markdown');
          }}
          className={PROMPT_ACTION}
        >
          <span aria-hidden="true" className={PROMPT_ACTION_ICON}>
            💾
          </span>
          Download .md
        </button>
      </ControlTooltip>

      {/* Offered only when the configuration genuinely is more than one sheet, counting both axes it
          can split along: a mode covering one facing at a time over a set naming more than one, and
          a pairing whose inventory outgrew a single generation. */}
      {runCount > 1 && (
        <ControlTooltip
          hint={`Split into ${String(runCount)} sheets`}
          text={STUDIO_ACTION_TOOLTIPS.splitIntoSheets}
        >
          <button
            type="button"
            onClick={toggleSplitModal}
            // Alone among the four in coming and going with the configuration, so it arrives rather
            // than simply being there — which is what tells the user it is new.
            className={`${PROMPT_ACTION} animate-pop-in`}
          >
            <span aria-hidden="true" className={PROMPT_ACTION_ICON}>
              🧩
            </span>
            Split into {runCount} sheets
          </button>
        </ControlTooltip>
      )}

      {/* `ml-auto` belongs to the wrapper, which is the flex item in this row now — on the button it
          would be measured against the wrapper's own box and push nothing. */}
      <ControlTooltip
        hint="Copy Prompt"
        text={STUDIO_ACTION_TOOLTIPS.copyPrompt}
        className="relative ml-auto inline-flex"
      >
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
