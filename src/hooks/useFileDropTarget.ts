import { useState } from 'react';
import type { DragEventHandler } from 'react';

/**
 * The drag-and-drop half of a drop target: whether a file is over it, and the handlers that keep
 * that answer right.
 *
 * Shared by the quantiser's drop zone and the studio's identity-lock control, which want the same
 * behaviour and quite different presentation — one is a tab's whole primary surface, the other a
 * compact row beside a text field. So the behaviour is here and each keeps its own layout and copy,
 * rather than one component growing props for both.
 *
 * `dropHandlers` is spread onto whichever element draws the target; `isDraggedOver` is what that
 * element styles itself by.
 *
 * **This is the accepting half of a pair.** Everywhere the app does *not* draw a target, the same
 * navigation is refused instead — see `useFileDropGuard`, which the shell registers on the window.
 * The two do not overlap: the guard stands aside for any event a target here has already cancelled.
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
