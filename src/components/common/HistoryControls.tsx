import { useUndoShortcut } from '../../hooks/useUndoShortcut.ts';
import { Badge } from './Badge.tsx';
import { ControlTooltip } from './ControlTooltip.tsx';

/**
 * The panel two tabs put over an undo stack: how far back it reaches, and the two steps.
 *
 * Shared rather than written twice, because the Studio's stack and the Quantise tab's are the same
 * control over different state — and a second copy is where one of them quietly stops registering
 * the keyboard shortcut, or grows a differently-worded empty state. What each tab supplies is what
 * genuinely differs: what the stack is called, its own two sentences of guidance, and the pair of
 * functions that move it.
 *
 * The counts arrive as numbers rather than as a history, so this file knows nothing about either
 * stack's shape. Each caller derives them from its own store during render, which is the app's rule
 * for anything a `useState` and an effect would otherwise chase.
 */
interface HistoryControlsProps {
  /** What the stack is called, which is the panel's own heading. */
  readonly label: string;
  /** How many positions are behind the current one. Zero is the empty state. */
  readonly stepsBack: number;
  /** Whether a position was stepped back from and not yet written over. */
  readonly canRedo: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly undoTooltip: string;
  readonly redoTooltip: string;
  /** The paragraph under the buttons, which the caller keys to whether there is anything to undo. */
  readonly guidance: string;
}

export function HistoryControls({
  label,
  stepsBack,
  canRedo,
  undo,
  redo,
  undoTooltip,
  redoTooltip,
  guidance,
}: HistoryControlsProps) {
  // Claimed for the window rather than for this panel: the control a reader has just moved is what
  // holds focus when they want it, and that is a slider or a combo box some way down the page. Only
  // one tab is mounted at a time, so the two callers never register it at once.
  useUndoShortcut(undo, redo);

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        {stepsBack === 0 ? (
          <Badge tone="attention">Nothing to step back to</Badge>
        ) : (
          <Badge tone="valid">
            {stepsBack} {stepsBack === 1 ? 'step' : 'steps'} back
          </Badge>
        )}

        <ControlTooltip className="relative ml-auto inline-flex" hint="Undo" text={undoTooltip}>
          <button type="button" disabled={stepsBack === 0} onClick={undo} className={STEP_BUTTON}>
            Undo
          </button>
        </ControlTooltip>

        <ControlTooltip hint="Redo" text={redoTooltip}>
          <button type="button" disabled={!canRedo} onClick={redo} className={STEP_BUTTON}>
            Redo
          </button>
        </ControlTooltip>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidance}</p>
    </section>
  );
}

/**
 * The two buttons' styling, written once because they are one control in two directions.
 *
 * The disabled state names a token rather than reaching for an opacity, and it puts the hover back
 * where it started: a disabled button still matches `:hover`, so without the last two the greyed
 * Redo would light up under the pointer as though it were about to do something.
 */
const STEP_BUTTON =
  'rounded-lg border border-foundry-600 bg-foundry-700 px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-390 hover:bg-foundry-600 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-foundry-700 disabled:hover:text-ink-faint';
