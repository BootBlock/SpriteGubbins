import { useEffect } from 'react';

/**
 * The page's answer to a file dropped anywhere that is not a drop target: nothing at all.
 *
 * Under the HTML drag-and-drop model a `drop` whose `dragover` was never cancelled keeps its default
 * action, and for a dragged file that action is to **open the file** — the browser navigates away and
 * the tab is gone. `useFileDropTarget` cancels both events on the two elements that accept a file,
 * which is what makes those two work; everywhere else on the page — the header, the studio form, a
 * preset card, the space beside a panel — nothing objected, so a drop landing an inch wide of the
 * quantiser's zone took the whole session with it. Nothing in `useQuantiseStore` is persisted, so
 * what a misaimed drop costs is the loaded sheet, every dial position, the auto-tune report and both
 * undo stacks, with nothing to restore them from.
 *
 * The guard belongs on the window rather than on the shell's outermost `<div>` because the behaviour
 * it answers is the **document's** default, not an element's: it applies wherever the page did not
 * object, including the margin outside the layout. Registered once here, a third drop target added
 * later inherits it rather than having to remember it.
 *
 * Three conditions decide whether a given drag is this hook's business, and each one is load-bearing:
 *
 * - **`defaultPrevented` means a drop target already claimed it.** React 19 delegates `onDragOver`
 *   and `onDrop` to the root container, which is inside this listener's element, so by the time the
 *   event reaches the window the zone's own `preventDefault()` has already run and is visible here.
 *   Without the check this guard would refuse the two drops the app exists to accept.
 * - **Only a drag carrying files is refused.** Dragging selected text into a text field is an
 *   ordinary editing gesture whose default action is what inserts the text, and the app has a form
 *   full of them. A file drag is the only kind that navigates, and `types` naming `Files` is how the
 *   platform says a drag is one.
 * - **`dropEffect` is set on `dragover` only.** It is what the cursor is drawn from, so `'none'` is
 *   the page saying *not here* while the file is still in the air, and by the model a drag ending
 *   on `'none'` delivers no `drop` at all. On the `drop` event the transfer is in read-only mode and
 *   the property means nothing, so the guard cancels there and says no more than that.
 *
 * The `drop` listener is not redundant with the `dragover` one. Cancelling `dragover` is what the
 * model says stops the navigation, and the second listener is what stands behind it if a `drop` is
 * delivered anyway — the same pairing, and the same reason, as the two `preventDefault()` calls
 * inside `useFileDropTarget`.
 */
export function useFileDropGuard(): void {
  useEffect(() => {
    function refuseStrayFile(event: DragEvent) {
      if (event.defaultPrevented) return;

      const transfer = event.dataTransfer;
      if (transfer === null || !transfer.types.includes('Files')) return;

      event.preventDefault();
      if (event.type === 'dragover') transfer.dropEffect = 'none';
    }

    window.addEventListener('dragover', refuseStrayFile);
    window.addEventListener('drop', refuseStrayFile);
    return () => {
      window.removeEventListener('dragover', refuseStrayFile);
      window.removeEventListener('drop', refuseStrayFile);
    };
  }, []);
}
