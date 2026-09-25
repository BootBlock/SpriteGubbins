import { useEffect } from 'react';

/**
 * Put `image` on `canvas` verbatim, once each time either of them changes, and at no other time.
 *
 * React writes the `width`/`height` attributes first, which blanks the backing store, so the paint
 * has to follow the commit rather than sit in the render. Zoom is absent on purpose: it changes the
 * CSS box, never the pixels.
 *
 * **The pixels, and the canvas they go on — nothing else.** The `ImageData` is what changes when
 * there is something new to draw, and the canvas takes its size from that same value, so nothing
 * can resize without this re-running; depending on a wrapper rebuilt every render instead would
 * mean a `putImageData` of up to 67 megabytes, on the main thread, for every render of the panel.
 * The element is a dependency for the opposite reason: a canvas that has just been mounted is
 * blank, and the image it wants may not have changed at all.
 *
 * **One call per canvas**, because two images change at different rates. `ImageComparison`'s sheet
 * is fixed while it is loaded, and its second image is new on every result, difference-scale press
 * and layout change. One effect over both redrew the unchanged sheet each time, on the thread the
 * drag-pan and the dials need (#381).
 *
 * A `null` canvas or an `undefined` image is a pane that is showing its `<p>` instead, and draws
 * nothing.
 */
export function useCanvasPaint(canvas: HTMLCanvasElement | null, image: ImageData | undefined): void {
  useEffect(() => {
    if (canvas === null || image === undefined) return;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
  }, [canvas, image]);
}
