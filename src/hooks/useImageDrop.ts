import { useEffect, useState } from 'react';

/**
 * Accepting an image dropped anywhere on the page, and saying so while one is in the air.
 *
 * Registered on the window rather than on a drop zone, for the reason `useImagePaste` gives about
 * the gesture beside it: a surface whose only input is an image can read a file arriving over it as
 * nothing else, so asking the reader to hit one panel out of ten makes the quickest way in the
 * fussiest. That argument is the whole of why this is right on the Quantise tab **and nowhere
 * else** — a window listener added by one control among a studio form's many would rewrite a field
 * the reader was nowhere near, which is why `IdentityPaletteCapture` keeps the element-level
 * `useFileDropTarget` and gains nothing from this.
 *
 * **The capture phase, so nothing between the drag and this listener can change the answer.**
 * `useFileDropGuard` is on the same window, refusing every file drag the page did not claim, and it
 * stands aside for anything already cancelled. On the bubble phase the two would run in registration
 * order, which is mount order — this tab mounts before the shell on a cold load and after it on
 * every navigation. Today they agree under either order, because the model reads `dropEffect` back
 * once the dispatch is over and whichever of them ran last had written `'copy'`; what capture buys
 * is that the agreement stops being a coincidence to re-derive whenever either hook changes, and
 * that an element inside the tab could not take the page's claim away with a `stopPropagation()`.
 *
 * **Only a drag carrying files is claimed**, on the guard's reasoning: dragging selected text into a
 * number field is an ordinary editing gesture whose default action is what inserts the text, and
 * this tab has a column of them.
 *
 * **A `dragleave` is a departure from an element, not from the window.** This listener sits above
 * every element on the page, so it hears one each time the drag crosses from one to the next — and
 * an engine is free to fire that before or after the matching `dragenter`. Clearing on the next
 * frame instead, and cancelling that the moment anything re-claims the drag, is right under either
 * ordering and needs no assumption about `relatedTarget`. A drag that has genuinely left the window
 * re-claims nothing, so the veil goes one frame later.
 *
 * @param acceptFile must be stable — it is a dependency of the listeners, so a fresh function every
 * render would tear them down and re-register them every render.
 * @returns whether a file is currently over this window, which is what the tab draws its veil from.
 */
export function useImageDrop(acceptFile: (file: File | null | undefined) => void): boolean {
  const [isFileOver, setIsFileOver] = useState(false);

  useEffect(() => {
    let clearing: number | null = null;

    function cancelClearing() {
      if (clearing === null) return;
      cancelAnimationFrame(clearing);
      clearing = null;
    }

    function claim(event: DragEvent) {
      const transfer = fileTransfer(event);
      if (transfer === null) return;

      // Without this the browser navigates to the dropped file and the app is gone, along with
      // everything the Quantise tab holds. Cancelling `dragover` is what the model says stops that;
      // the `drop` listener below cancels again for the same reason `useFileDropTarget` does.
      event.preventDefault();
      // What the cursor is drawn from while the file is still in the air — the opposite number of
      // the guard's `'none'`, and the reason a drag over this tab now says *yes* rather than *no*.
      transfer.dropEffect = 'copy';
      cancelClearing();
      setIsFileOver(true);
    }

    function release(event: DragEvent) {
      if (fileTransfer(event) === null) return;
      clearing = requestAnimationFrame(() => {
        clearing = null;
        setIsFileOver(false);
      });
    }

    function take(event: DragEvent) {
      const transfer = fileTransfer(event);
      if (transfer === null) return;

      event.preventDefault();
      transfer.dropEffect = 'copy';
      cancelClearing();
      setIsFileOver(false);
      acceptFile(transfer.files.item(0));
    }

    window.addEventListener('dragenter', claim, true);
    window.addEventListener('dragover', claim, true);
    window.addEventListener('dragleave', release, true);
    window.addEventListener('drop', take, true);
    return () => {
      cancelClearing();
      window.removeEventListener('dragenter', claim, true);
      window.removeEventListener('dragover', claim, true);
      window.removeEventListener('dragleave', release, true);
      window.removeEventListener('drop', take, true);
    };
  }, [acceptFile]);

  return isFileOver;
}

/**
 * The event's transfer, but only where the drag carries files — `null` for everything else.
 *
 * A function returning the transfer rather than a boolean asking about it, so the three handlers
 * above get the narrowing as well as the answer: `dataTransfer` is nullable, and a predicate
 * returning `true` tells the compiler nothing about the property it looked at.
 */
function fileTransfer(event: DragEvent): DataTransfer | null {
  const transfer = event.dataTransfer;
  // `types` naming `Files` is how the platform says a drag carries files.
  return transfer !== null && transfer.types.includes('Files') ? transfer : null;
}
