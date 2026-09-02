import { useEffect } from 'react';

/**
 * A window's answer to a file dropped anywhere that is not a drop target: nothing at all.
 *
 * Under the HTML drag-and-drop model a `drop` whose `dragover` was never cancelled keeps its default
 * action, and by that model the action for a dragged file is to **open the file** — the window
 * navigates away and what it was showing is gone. `useFileDropTarget` cancels both events on the two
 * elements that accept a file, which is what makes those two work; everywhere else on the page —
 * the header, the studio form, a preset card, the space beside a panel — nothing objected, so a drop
 * landing an inch wide of the quantiser's zone took the session with it. Nothing in
 * `useQuantiseStore` is persisted, so what that costs is the loaded sheet, every dial position, the
 * auto-tune report and the quantiser's undo history, with nothing to restore them from.
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
 * Three conditions decide whether a given drag is this hook's business, and each one is load-bearing:
 *
 * - **`defaultPrevented` means a drop target already claimed it.** React 19 delegates `onDragOver`
 *   and `onDrop` to the root container, which is inside this listener's window, so by the time the
 *   event arrives here the zone's own `preventDefault()` has already run and is visible. Without the
 *   check this guard would refuse the two drops the app exists to accept.
 * - **Only a drag carrying files is refused.** Dragging selected text into a text field is an
 *   ordinary editing gesture whose default action is what inserts the text, and the app has a form
 *   full of them. `types` naming `Files` is how the platform says a drag carries files. A drag
 *   carrying a URL and no file — a link or an image dragged out of another tab — navigates just the
 *   same and is **not** covered: refusing it means telling an editable target from an inert one,
 *   which is a wider change than this one.
 * - **`dropEffect` is set on both events, because both are read.** On `dragover` it is what the
 *   cursor is drawn from, so `'none'` is the window saying *not here* while the file is still in the
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

    function refuseStrayFile(event: DragEvent) {
      if (event.defaultPrevented) return;

      const transfer = event.dataTransfer;
      if (transfer === null || !transfer.types.includes('Files')) return;

      event.preventDefault();
      transfer.dropEffect = 'none';
    }

    view.addEventListener('dragover', refuseStrayFile);
    view.addEventListener('drop', refuseStrayFile);
    return () => {
      view.removeEventListener('dragover', refuseStrayFile);
      view.removeEventListener('drop', refuseStrayFile);
    };
  }, [view]);
}
