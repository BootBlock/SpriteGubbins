import { useEffect } from 'react';
import { isTextEntry } from './isTextEntry.ts';

/**
 * A window's answer to a drag dropped anywhere that can make no use of it: nothing at all.
 *
 * Under the HTML drag-and-drop model a `drop` whose `dragover` was never cancelled keeps its default
 * action, and by that model the action for a dragged file is to **open the file**, and the action
 * for a dragged URL is to **navigate to it** — either way the window goes and what it was showing is
 * gone. Two hooks cancel both events where a file is welcome: `useImageDrop` on the window while the
 * Quantise tab is mounted, and `useFileDropTarget` on the studio's identity-lock control. Everywhere
 * else — the header, the studio form around that control, a preset card, the space beside a panel —
 * nothing objected, so a drop landing an inch wide of one of them took the session with it. Nothing
 * in `useQuantiseStore` is persisted, so what that costs is the loaded sheet, every dial position,
 * the auto-tune report and the quantiser's undo history, with nothing to restore them from.
 *
 * The guard goes on a window rather than on the shell's outermost element because the behaviour it
 * answers is the **document's** default, not an element's: it applies wherever the page did not
 * object, including the margin outside the layout.
 *
 * **It takes the window rather than reading the global**, which is the mistake `useAnchoredSurface`
 * records at length: the quantiser's comparison panel can be portalled into a window of its own, and
 * a listener bound to this module's `window` never hears an event dispatched in that document. So
 * `App` guards the page and `useDetachedWindow` guards whatever it opens, and a panel detached later
 * inherits the guard rather than having to remember it. `null` is the ordinary resting state of the
 * second one — no window open, nothing to listen to.
 *
 * Four conditions decide whether a given drag is this hook's business, and each one is load-bearing:
 *
 * - **`defaultPrevented` means something already claimed it.** React 19 delegates `onDragOver` and
 *   `onDrop` to the root container, which is inside this listener's window, so by the time the event
 *   arrives here the identity-lock control's own `preventDefault()` has already run and is visible.
 *   The Quantise tab's window listener is on the **capture** phase, which is ahead of this bubble
 *   one however the two were registered — see `useImageDrop`, which says why it cannot rely on
 *   registration order. Without this check the guard would refuse the drops the app exists to
 *   accept.
 * - **A drag carrying files is refused wherever it landed.** `types` naming `Files` is how the
 *   platform says a drag carries files, and no control in this app takes one by any route but the
 *   two above — a file dropped on a text input navigates just the same as one dropped on the header.
 * - **A drag carrying no file is refused unless the target edits text.** Dragging selected text or a
 *   link into a field is an ordinary editing gesture whose default action is what inserts it, and
 *   the app is mostly form. Anywhere else that same default is a navigation: a link dragged out of
 *   another tab onto the header goes, and takes the sheet with it. So the target decides, and
 *   `isTextEntry` is the predicate — shared with `useUndoShortcut`, which asks the same question
 *   about the same controls for its own reasons.
 * - **`dropEffect` is set on both events, because both are read.** On `dragover` it is what the
 *   cursor is drawn from, so `'none'` is the window saying *not here* while the drag is still in the
 *   air, and by the model a drag ending on `'none'` delivers no `drop` at all. On a **cancelled**
 *   `drop` the model reads the same attribute back as the current drag operation, which is what the
 *   drag source is then told happened — so leaving the inherited `'copy'` there would report a copy
 *   that nothing performed.
 *
 * The `drop` listener is not redundant with the `dragover` one. Cancelling `dragover` is what the
 * model says stops the navigation, and the second listener is what stands behind it if a `drop` is
 * delivered anyway — the same pairing, and the same reason, as the two `preventDefault()` calls
 * inside `useFileDropTarget`.
 */
export function useFileDropGuard(view: Window | null): void {
  useEffect(() => {
    if (view === null) return;

    // An arrow rather than a declaration, because the handler reads `view` and a `function`
    // declaration is hoisted above the null check — where TypeScript will not carry the narrowing
    // in, and `isTextEntry` takes a window rather than a window or nothing.
    const refuseStrayDrag = (event: DragEvent) => {
      if (event.defaultPrevented) return;

      const transfer = event.dataTransfer;
      if (transfer === null) return;
      if (!transfer.types.includes('Files') && isTextEntry(event.target, view)) return;

      event.preventDefault();
      transfer.dropEffect = 'none';
    };

    view.addEventListener('dragover', refuseStrayDrag);
    view.addEventListener('drop', refuseStrayDrag);
    return () => {
      view.removeEventListener('dragover', refuseStrayDrag);
      view.removeEventListener('drop', refuseStrayDrag);
    };
  }, [view]);
}
