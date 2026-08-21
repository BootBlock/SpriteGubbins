import { useEffect } from 'react';
import { DIAL_HISTORY_GUIDANCE } from '../../constants/dialHistory.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { canRedoDials, canUndoDials, undoDepth } from '../../utils/dialHistory.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * Stepping the dials back through the positions they have been in, and forward again.
 *
 * Above the dials rather than below them, and the first panel after the drop zone: it governs every
 * control on the tab, and the reason to reach for it — having just moved something and lost the
 * position it was at — arrives while looking at the sliders it sits over.
 *
 * The counts are derived from the store's history during render rather than kept beside it, which is
 * the app's rule for anything a `useState` and an effect would otherwise chase. The panel subscribes
 * to the history itself rather than to a count, because that is the one value here whose identity
 * genuinely changes on every dial edit — this is the panel the flat dial fields exist to keep every
 * *other* one from having to do that.
 */
export function DialHistoryControls() {
  const history = useQuantiseStore((state) => state.history);
  const undo = useQuantiseStore((state) => state.undo);
  const redo = useQuantiseStore((state) => state.redo);

  const stepsBack = undoDepth(history);
  const canUndo = canUndoDials(history);
  const canRedo = canRedoDials(history);

  // The shortcut every editor has, claimed for the window rather than for this panel: the dial the
  // reader has just moved is what holds focus when they want it, and that is a slider three panels
  // down. It is registered only while this tab has a sheet, which is the only time there are dials
  // on screen for it to be about.
  //
  // **A text box keeps its own undo**, which is the one case a window-wide binding must not take:
  // the grid box and the two preset name fields have a native stack of their own, and a reader
  // pressing the shortcut inside one means that one. A slider or a select is not that case — neither
  // has any undo of its own — so the test is what kind of control has focus rather than whether a
  // control has it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextEntry(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [undo, redo]);

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Dial history</p>
        {stepsBack === 0 ? (
          <Badge tone="attention">Nothing to step back to</Badge>
        ) : (
          <Badge tone="valid">
            {stepsBack} {stepsBack === 1 ? 'step' : 'steps'} back
          </Badge>
        )}

        <ControlTooltip
          className="relative ml-auto inline-flex"
          hint="Undo"
          text={QUANTISE_ACTION_TOOLTIPS.undoDials}
        >
          <button type="button" disabled={!canUndo} onClick={undo} className={STEP_BUTTON}>
            Undo
          </button>
        </ControlTooltip>

        <ControlTooltip hint="Redo" text={QUANTISE_ACTION_TOOLTIPS.redoDials}>
          <button type="button" disabled={!canRedo} onClick={redo} className={STEP_BUTTON}>
            Redo
          </button>
        </ControlTooltip>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {canUndo ? DIAL_HISTORY_GUIDANCE.available : DIAL_HISTORY_GUIDANCE.open}
      </p>
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

/**
 * Whether a keypress landed in something with an undo stack of its own.
 *
 * Text entry only, which is narrower than "an input": a range slider and a select are both form
 * controls and neither has a stack for the shortcut to belong to, and fourteen of this tab's sixteen
 * dials are one or the other. A `type` a browser does not know falls back to `text`, so an unknown
 * one is treated as text entry — the safe direction, since the cost of being wrong that way is a
 * shortcut that does nothing rather than one that eats a reader's typing.
 */
function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !NON_TEXT_INPUT_TYPES.has(target.type);
}

/** The input types that hold no text, and therefore no undo of their own. */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);
