import { useState } from 'react';
import type { DragEventHandler } from 'react';

/**
 * The drag-and-drop half of a drop target: whether a file is over it, and the handlers that keep
 * that answer right.
 *
 * `dropHandlers` is spread onto whichever element draws the target; `isDraggedOver` is what that
 * element styles itself by.
 *
 * **One caller, and it stays a hook.** The quantiser's drop zone was the second, until the Quantise
 * tab took the gesture for its whole page and left the studio's identity-lock control on its own —
 * see `useImageDrop`, which says why the page-wide claim is right on that tab and wrong on a control
 * in a form. What is left here is not a wrapped `useState`: the two `preventDefault()` calls and the
 * `dragleave`-from-a-child test below are platform knowledge with a documented reason each, and the
 * guard's own test renders a real target rather than a mime precisely so the composition it asserts
 * is the one the app runs.
 *
 * **This is one of the two accepting halves of a pair.** Anywhere a file can land that neither this
 * nor `useImageDrop` has claimed — the rest of the page, and the window the comparison panel
 * detaches into — the drop is refused instead, because otherwise the browser opens the file and
 * navigates that window away. `useFileDropGuard` is the refusing half; `App` hands it the page's
 * window and `useDetachedWindow` hands it whatever it opened. They do not overlap: the guard stands
 * aside for any event an accepting half has already cancelled.
 */
export function useFileDropTarget(acceptFile: (file: File | null | undefined) => void): FileDropTarget {
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  return {
    isDraggedOver,
    dropHandlers: {
      onDragOver: (event) => {
        // Without this the browser navigates to the dropped file and the app is gone, along with
        // whatever was loaded in it.
        event.preventDefault();
        setIsDraggedOver(true);
      },
      onDragLeave: (event) => {
        // `dragleave` bubbles from every child, so a drag crossing the text inside the target would
        // otherwise read as a drag leaving it. Only a departure to somewhere outside counts.
        const { relatedTarget } = event;
        if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
        setIsDraggedOver(false);
      },
      onDrop: (event) => {
        event.preventDefault();
        setIsDraggedOver(false);
        acceptFile(event.dataTransfer.files.item(0));
      },
    },
  };
}

/** What a drop target needs from this hook: one flag to style by, three handlers to spread. */
export interface FileDropTarget {
  readonly isDraggedOver: boolean;
  readonly dropHandlers: {
    readonly onDragOver: DragEventHandler<HTMLElement>;
    readonly onDragLeave: DragEventHandler<HTMLElement>;
    readonly onDrop: DragEventHandler<HTMLElement>;
  };
}
