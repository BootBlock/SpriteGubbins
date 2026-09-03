import { useLayoutEffect, useRef } from 'react';

interface ImageDropVeilProps {
  /** The image currently loaded, or `null` before anything has been brought in. */
  readonly currentName: string | null;
}

/**
 * What the page says while a file is in the air over it.
 *
 * The Quantise tab accepts a dropped sheet anywhere, on the same argument that lets it accept a
 * pasted one anywhere — see `useImageDrop`. A drop has an aiming affordance a paste does not,
 * though, so a tab that accepts the gesture everywhere has to say so everywhere, and this is that
 * sentence. It replaces the highlight `ImageDropZone` used to run on itself: one gesture gets one
 * signal, and a zone blooming three panels below the header while the file is over the header would
 * be describing a target that no longer exists.
 *
 * **Viewport-fixed rather than drawn on the tab**, because the tab is taller than the screen once a
 * sheet is loaded. A ring around the tab's own box is invisible from the frame-alignment dial, which
 * is exactly where a reader with a second sheet to try is standing.
 *
 * **Lifted into the top layer.** The app's floating surfaces do this through `useAnchoredSurface`,
 * which cannot serve here — there is no anchor and nothing to place — but the reason is the same
 * one that file records: a `z-index` is only ever compared inside the nearest stacking context, and
 * this veil has to cover an open modal `<dialog>` as well as the page, since the drop it announces
 * lands whether or not one is open. The lift is applied here rather than in the markup so that the
 * attribute and the call arrive together: `showPopover()` on an element carrying no `popover`
 * attribute throws, and a `popover` attribute on an element that is never shown is `display: none`.
 * A browser without the API keeps the fixed, un-lifted veil, which is correct today — nothing
 * between this element and the viewport carries a `backdrop-filter` — and would only mis-layer under
 * a dialog.
 *
 * Two lines of the user-agent popover stylesheet have to be answered, and both are silent when they
 * are not: it sizes a popover `fit-content`, which `h-auto w-auto` hands back to the four insets, and
 * it sets `color: CanvasText`, which takes the text out of the palette unless the surface names its
 * own.
 *
 * **`backdrop-in` rather than `fade-in`, which is the entrance a panel takes.** That one nudges its
 * surface up eight pixels on the way in, and eight pixels of travel on a box whose whole job is to
 * cover the viewport is eight pixels of the bottom edge left uncovered for the length of the
 * animation. What this is arriving as is a ground dimming, which is what `backdrop-in` already
 * names, and it is a pure opacity fade.
 *
 * `aria-hidden`, because dragging a file is a pointer gesture with no keyboard or screen-reader
 * equivalent — the file picker beside the drop zone is that route, and it announces itself. The tab's
 * own live region reports what happens to the sheet once one lands.
 */
export function ImageDropVeil({ currentName }: ImageDropVeilProps) {
  const veilRef = useRef<HTMLDivElement>(null);

  // `useLayoutEffect`, not `useEffect`: this moves the veil into another layer, so running it after
  // paint would show one frame of it in the ordinary document.
  useLayoutEffect(() => {
    const veil = veilRef.current;
    if (veil === null) return;
    if (typeof veil.showPopover !== 'function') return;

    // `manual` rather than `auto`: an auto popover light-dismisses on the next press anywhere, and
    // what this surface is waiting for is a drop.
    veil.setAttribute('popover', 'manual');
    veil.showPopover();
    return () => {
      veil.hidePopover();
    };
  }, []);

  return (
    <div
      ref={veilRef}
      aria-hidden="true"
      className="animate-backdrop-in pointer-events-none fixed inset-0 h-auto w-auto overflow-hidden bg-foundry-950/80 p-4 text-ink backdrop-blur-md"
    >
      <div className="flex size-full items-center justify-center rounded-3xl border-2 border-dashed border-tab bg-tab/5 p-6 text-center">
        <div>
          {/* No tone of its own: the veil declares `text-ink` for its whole subtree, because the
              user-agent popover stylesheet would otherwise hand it `CanvasText`. */}
          <p className="text-base font-bold">
            {currentName === null ? 'Drop the sheet anywhere' : 'Drop anywhere to replace the loaded sheet'}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-muted">
            Anywhere on this page will do while the Quantise tab is open. Nothing is uploaded — the image is
            decoded in this tab and never leaves it.
          </p>
        </div>
      </div>
    </div>
  );
}
