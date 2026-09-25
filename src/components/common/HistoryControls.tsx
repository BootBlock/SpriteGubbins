import { useUndoShortcut } from '../../hooks/useUndoShortcut.ts';
import { Badge } from './Badge.tsx';
import { ControlTooltip } from './ControlTooltip.tsx';
import { Button } from './Button.tsx';

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
          <Button variant="secondary" size="md" disabled={stepsBack === 0} onClick={undo}>
            Undo
          </Button>
        </ControlTooltip>

        <ControlTooltip hint="Redo" text={redoTooltip}>
          <Button variant="secondary" size="md" disabled={!canRedo} onClick={redo}>
            Redo
          </Button>
        </ControlTooltip>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidance}</p>
    </section>
  );
}
