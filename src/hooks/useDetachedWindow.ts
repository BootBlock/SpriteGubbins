import { useCallback, useEffect, useRef, useState } from 'react';

/** The size a detached window opens at, in CSS pixels. */
interface WindowSize {
  readonly width: number;
  readonly height: number;
}

/** What a panel needs to move itself into a window of its own and take itself back again. */
export interface DetachedWindow {
  /** The window the panel is portalled into, or `null` while it is in the page. */
  readonly target: Window | null;
  /** Whether the last attempt to open one was refused, which the panel has to say out loud. */
  readonly refused: boolean;
  /**
   * Open one, sized from the element the panel currently occupies.
   *
   * Called straight out of a click handler and never awaited by the caller: both routes below need
   * **transient activation**, so anything that put a turn of the event loop between the press and
   * the request would have the browser refuse it.
   */
  readonly detach: (occupying: HTMLElement | null) => void;
  readonly reattach: () => void;
}

/**
 * The smallest window worth opening, whatever the panel measured.
 *
 * A detached preview exists to be looked at, and Chromium rejects a picture-in-picture request whose
 * width or height is zero — which is what an unmounted or hidden anchor measures.
 */
const SMALLEST: WindowSize = { width: 480, height: 360 };

/**
 * A second window for a panel to live in, opened on request and closed with the panel.
 *
 * **Two routes, preferred in order, and one of them is not everywhere.**
 * `documentPictureInPicture.requestWindow()` gives a chromeless window that stays *above* the
 * opener, which is what a reader turning dials in the main window while watching the preview
 * actually needs — an ordinary popup drops behind the main window the moment it is clicked. It is
 * Chromium-only, so `window.open` is the fallback, and it is also the fallback when the request is
 * refused: picture-in-picture can be disallowed in a context where a popup is still permitted, and
 * the transient activation the press granted is still good for the second attempt.
 *
 * **Both can be refused outright**, and a control that appears to do nothing is the worst outcome
 * available — so a refusal is state the panel renders rather than a silence.
 *
 * **Both routes stay cross-origin isolated, and that is measured rather than assumed.** The app
 * makes itself isolated two different ways — server headers in dev, and `src/sw.ts` injecting them
 * in production — and neither obviously covers a window opened from script: an `about:blank` popup
 * is never *fetched*, so no service worker claims it (`navigator.serviceWorker.controller` is
 * `null` inside one). It inherits the opener's policy container instead. Verified on the built app
 * behind a header-less static server, with the worker in control of the opener: both the popup and
 * the picture-in-picture window report `crossOriginIsolated === true`. Nothing in the detached panel
 * needs isolation today, so this is a property being kept rather than one being relied on.
 *
 * **The window is closed by whatever disowns it, and never by an effect's cleanup.** React 19's
 * Strict Mode runs every effect's cleanup once on mount and then re-runs the effect, so a `close()`
 * in the cleanup of the effect that adopts the window would destroy it the instant it opened, in
 * development only. The close therefore lives in `reattach` and in an unmount-only effect, whose
 * spurious first cleanup finds the ref still empty and closes nothing.
 */
export function useDetachedWindow(title: string): DetachedWindow {
  const [target, setTarget] = useState<Window | null>(null);
  const [refused, setRefused] = useState(false);
  // What `reattach` and unmount close. Beside the state rather than instead of it, because the state
  // is what the panel renders from and a ref cannot re-render it.
  const opened = useRef<Window | null>(null);

  const adopt = useCallback((view: Window) => {
    opened.current = view;
    setRefused(false);
    setTarget(view);
  }, []);

  const detach = useCallback(
    (occupying: HTMLElement | null) => {
      const size = sizeFor(occupying);
      const pictureInPicture = window.documentPictureInPicture;
      if (pictureInPicture !== undefined) {
        void pictureInPicture.requestWindow(size).then(adopt, () => {
          // Refused where a popup may still be allowed — see above. The press's activation is still
          // live, so this second attempt is the reader's answer rather than a retry of the same one.
          openPopup(size, adopt, setRefused);
        });
        return;
      }
      openPopup(size, adopt, setRefused);
    },
    [adopt],
  );

  // Only the state. The window is closed by the effect below, once React has taken the panel's
  // elements back out of it — see there for why closing it here is not an option.
  const reattach = useCallback(() => {
    setTarget(null);
  }, []);

  /**
   * Close whatever is no longer being rendered into, **after** the commit that emptied it.
   *
   * Closing in the handler that asked for it is a frame too early: the state change has not been
   * rendered yet, so the panel's elements are still in that window's document when it is torn down —
   * and React then unmounts the portal by removing children from a container that no longer belongs
   * to a live document. Measured as a `removeChild` failure, which happens during a commit and takes
   * the app with it. Waiting for the effect means the portal has already been unmounted, and the
   * window is empty by the time it goes.
   *
   * The same effect covers the reader closing the window themselves: `onHide` clears the state, and
   * `close()` on an already-closed window is a no-op.
   */
  useEffect(() => {
    if (target !== null) return;
    opened.current?.close();
    opened.current = null;
  }, [target]);

  useEffect(() => {
    if (target === null) return;

    // The reader closing the window is the same instruction as pressing Return, and it is the only
    // one the page never hears about otherwise. `pagehide` fires for both routes and for every way
    // out of them — the window's own close button, the picture-in-picture control, the opener going.
    const onHide = () => {
      setTarget(null);
    };
    target.addEventListener('pagehide', onHide);

    // A popup **outlives its opener**: reloading the main window would leave one on screen with
    // nothing rendering into it, and every later reload would open another. A picture-in-picture
    // window closes itself with the opener, where this is simply redundant.
    const onOpenerHide = () => {
      target.close();
    };
    window.addEventListener('pagehide', onOpenerHide);

    return () => {
      target.removeEventListener('pagehide', onHide);
      window.removeEventListener('pagehide', onOpenerHide);
    };
  }, [target]);

  // The window's own name, kept in step with the sheet — a reader can drop a new image while the
  // preview is detached. Written through the ref, which is what actually *owns* the window: the
  // state beside it is the render signal, and React's compiler rules rightly refuse a write into a
  // value returned by `useState`. `target` is in the list as the trigger, since a ref being filled
  // in is not a render.
  useEffect(() => {
    if (target === null) return;
    const view = opened.current;
    if (view !== null) view.document.title = title;
  }, [target, title]);

  // Unmount only — navigating away from the tab takes the preview back into the page, which is the
  // behaviour asked for and also the only safe one: the subtree being portalled out of here is gone,
  // so a window left open would hold an empty document nothing can put anything into again.
  //
  // A cleanup with no dependencies rather than one on the effect above, because Strict Mode runs
  // every effect's cleanup once on mount and re-runs the effect: a `close()` in the cleanup of the
  // effect that *adopts* the window would destroy it the instant it opened, in development only.
  // Here the spurious first cleanup finds the ref still empty and closes nothing. The ordering that
  // makes the effect above wait does not arise, since a passive cleanup already runs after React has
  // removed the subtree's nodes.
  useEffect(
    () => () => {
      opened.current?.close();
      opened.current = null;
    },
    [],
  );

  return { target, refused, detach, reattach };
}

/**
 * The last resort and the only route two of the three engines have.
 *
 * `popup=yes` is what asks for a window rather than a tab; a browser configured to ignore it opens a
 * tab instead, which still works and is still better than nothing. `null` back means a blocker
 * refused it, which is the one failure the panel has to report.
 */
function openPopup(size: WindowSize, adopt: (view: Window) => void, refuse: (was: boolean) => void): void {
  const features = `popup=yes,width=${String(size.width)},height=${String(size.height)}`;
  const view = window.open('', '_blank', features);
  if (view === null) {
    refuse(true);
    return;
  }
  writeStandardsMode(view.document);
  adopt(view);
}

/**
 * Re-parse the opened document with a doctype, because `about:blank` has none.
 *
 * A document with no doctype is in **quirks mode**, and the popup route produces one every time —
 * measured in Edge as `document.compatMode === 'BackCompat'`. That is not a cosmetic difference. In
 * quirks mode the root element's `clientHeight` reports its own content box rather than the viewport,
 * and that pair is exactly what `useAnchoredSurface` clamps every floating surface against: measured
 * at 708 against an `innerHeight` of 610, which put a guidance card 90px past the bottom of the
 * window — and a surface in the top layer that hangs past an edge is not off-centre, it is
 * unreachable, since it contributes to no scroll region of its own.
 *
 * Writing the document is the only way to change this. `compatMode` is decided by the parser, so
 * inserting a doctype node afterwards changes nothing; `document.open()` re-runs the parser, which
 * is what this is for. It happens before the panel is adopted, so the fresh `body` this leaves
 * behind is the one the portal is given. The picture-in-picture route needs none of it — that window
 * is standards mode already, with no doctype node at all.
 */
function writeStandardsMode(target: Document): void {
  target.open();
  target.write('<!doctype html><html><head></head><body></body></html>');
  target.close();
}

/**
 * How big to open, taken from the box the panel is giving up rather than from a number chosen here.
 *
 * Opening at the size the preview already had is what makes the move read as the same panel in a
 * different place. The screen is the ceiling — Chromium rejects a picture-in-picture request larger
 * than it — and {@link SMALLEST} the floor, which also covers an anchor that measured zero.
 */
function sizeFor(occupying: HTMLElement | null): WindowSize {
  const box = occupying?.getBoundingClientRect();
  return {
    width: clamp(Math.round(box?.width ?? 0), SMALLEST.width, window.screen.availWidth),
    height: clamp(Math.round(box?.height ?? 0), SMALLEST.height, window.screen.availHeight),
  };
}

/** `Math.min` of the floor and the ceiling, so a screen smaller than the floor still yields the screen. */
function clamp(value: number, least: number, most: number): number {
  return Math.min(Math.max(value, least), most);
}
