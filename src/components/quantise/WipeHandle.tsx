import { useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { QUANTISE_TOOLTIPS, WIPE_STEP, WIPE_STEP_COARSE } from '../../constants/quantiser.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface WipeHandleProps {
  /** Where the divider stands, 0 at the frame's left edge and 1 at its right. */
  readonly at: number;
  readonly onMove: (at: number) => void;
  /**
   * The frame the divider divides, which is what a pointer position is measured against.
   *
   * Handed in rather than read off `parentElement`, which would make the control's arithmetic depend
   * on a piece of markup it cannot see — and would break silently the first time a wrapper was
   * introduced between the two. `ControlTooltip` introduces exactly such a wrapper.
   */
  readonly frameRef: RefObject<HTMLDivElement | null>;
}

/**
 * The divider between the two overlaid previews: draggable, and operable from the keyboard.
 *
 * **A real slider, not a decoration that happens to move.** It carries a value the reader sets, so it
 * is announced as one and reached by Tab like one — the arrow keys nudge it, Home and End take it to
 * either edge. A drag-only divider would be a control this app's own accessibility rules forbid, and
 * the keyboard route is not a fallback here: the frame beneath is a scrolling region a keyboard user
 * pans with the very same arrow keys, so without a focusable divider there would be no way to reach
 * the comparison at all.
 *
 * **It publishes its position as a custom property rather than positioning itself**, because the
 * position is one fact with two consumers — this handle's own offset and the clip that decides how
 * much of the upper preview shows. `WipePanes` sets `--wipe` on the frame; both read it from there,
 * so the divider and the edge it draws cannot come apart. Percentages throughout, so nothing has to
 * measure the frame to place either of them.
 *
 * `touch-action: none` is what makes a finger drag the divider rather than scroll the pane under it:
 * this is the one gesture in the tab that has to be claimed, because the browser's default for it
 * would pan a view the divider is meant to stay still against.
 */
export function WipeHandle({ at, onMove, frameRef }: WipeHandleProps) {
  const dragging = useRef<number | null>(null);
  const percent = Math.round(at * 100);

  function moveTo(clientX: number): void {
    const frame = frameRef.current;
    if (frame === null) return;
    const box = frame.getBoundingClientRect();
    if (box.width === 0) return;
    onMove(clamp((clientX - box.left) / box.width));
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    // The primary button only — which a finger and a nib also report, so the touch gesture this
    // control deliberately claims is unaffected. `useDragPan` states the reason for the mouse: the
    // middle button is the browser's own autoscroll and the right one opens the context menu, so
    // answering either takes something away. Here it would also *move the divider* before the menu
    // appeared, since the press positions it.
    if (event.button !== 0) return;
    if (dragging.current !== null) return;
    // Suppresses the text selection the press would otherwise start across both previews, and the
    // drag image a pointer over an image would offer.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    dragging.current = event.pointerId;
    moveTo(event.clientX);
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragging.current !== event.pointerId) return;
    // A move with the primary button no longer among those held means the release happened
    // somewhere this element never heard about. The case that makes the mask necessary rather than
    // tidy is a **chorded** release — press left, press right, release left — where the platform
    // fires no `pointerup` at all, because for a mouse that event arrives only on the *last* button
    // up. Without this the divider goes on following a pointer nobody is pressing.
    if ((event.buttons & 1) === 0) {
      dragging.current = null;
      return;
    }
    moveTo(event.clientX);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragging.current !== event.pointerId) return;
    dragging.current = null;
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const next = steppedFrom(at, event);
    if (next === null) return;
    // Claimed, because every one of these keys already means something to the scrolling frame below —
    // and a divider that moved *and* panned would leave the reader unable to do either deliberately.
    event.preventDefault();
    onMove(next);
  }

  return (
    <ControlTooltip
      hint="Wipe"
      text={QUANTISE_TOOLTIPS.wipe}
      // The wrapper takes the control's place in the layout, so the placement moves out here with it
      // — `ControlTooltip` says why it replaces the default rather than adding to it. `z-20` clears
      // the working overlay, which the divider has to stay usable through.
      className="absolute inset-y-0 left-[var(--wipe)] z-20 -translate-x-1/2 px-2"
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label="Wipe between the sheet as it arrived and the quantised sheet"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${String(percent)}% across the frame`}
        onPointerDown={beginDrag}
        onPointerMove={continueDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKeyDown}
        className="group flex h-full cursor-ew-resize touch-none items-center justify-center"
      >
        {/* The line itself, and the grip that says it can be taken hold of. Both are the view's own
            colour rather than the accent: this belongs to the quantiser's preview, not to the app's
            primary. The ring is what keeps a pale line legible over pale artwork. */}
        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-tab ring-1 ring-foundry-950/60" />
        <span
          aria-hidden="true"
          className="relative flex h-7 w-7 items-center justify-center rounded-full bg-tab text-2xs font-semibold text-foundry-950 shadow-lg transition-transform duration-390 group-hover:scale-110"
        >
          ↔
        </span>
      </div>
    </ControlTooltip>
  );
}

/** Nothing outside the frame is a position the divider can stand at. */
function clamp(at: number): number {
  return Math.min(1, Math.max(0, at));
}

/**
 * Where a key press puts the divider, or `null` for a key that is not one of ours.
 *
 * The set is the ARIA slider pattern's: the arrows step, `PageUp`/`PageDown` take the coarse step —
 * as does an arrow with `Shift`, which is what a pointer-first reader tries — and `Home`/`End` go to
 * the edges. `Up` moves with `Right` because this slider is horizontal and the pattern maps the two
 * that way, whatever the arrow's own direction suggests.
 */
function steppedFrom(at: number, event: ReactKeyboardEvent<HTMLDivElement>): number | null {
  const step = event.shiftKey ? WIPE_STEP_COARSE : WIPE_STEP;
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clamp(at - step);
    case 'ArrowRight':
    case 'ArrowUp':
      return clamp(at + step);
    case 'PageDown':
      return clamp(at - WIPE_STEP_COARSE);
    case 'PageUp':
      return clamp(at + WIPE_STEP_COARSE);
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return null;
  }
}
