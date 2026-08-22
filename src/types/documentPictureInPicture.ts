/**
 * The Document Picture-in-Picture API, typed.
 *
 * A Chromium extension to the web platform rather than a standard, so TypeScript's DOM library does
 * not declare it — the same position `BeforeInstallPromptEvent` is in, and the answer is the same
 * one: declare the two members the app actually touches, so a call on a browser that has neither is
 * a compile error about a possibly-`undefined` object rather than a runtime one.
 *
 * It is the **preferred** way the quantiser's preview detaches, because of what it gives that
 * `window.open` cannot: a chromeless window that stays above the opener. A reader watching a preview
 * while turning dials in the main window is precisely the case an ordinary popup fails at, since the
 * popup drops behind the moment the main window is clicked. It cannot be the *only* way, because
 * Firefox and Safari have none of this — see `useDetachedWindow`, which falls back to a popup.
 *
 * Declared against the Chromium behaviour: `requestWindow` needs transient activation, rejects when
 * it has none, and closes any window this document already has open in favour of the new one.
 */
export interface DocumentPictureInPictureOptions {
  /** The window's inner width in CSS pixels. Rejected if it exceeds the screen. */
  readonly width?: number;
  readonly height?: number;
}

export interface DocumentPictureInPicture extends EventTarget {
  /** The window this document currently has open, or `null`. At most one exists at a time. */
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}

declare global {
  interface Window {
    /**
     * Optional, and that is the whole point of the declaration: reaching a member without checking
     * for the object is what the compiler refuses, on the two engines where it is genuinely absent.
     */
    readonly documentPictureInPicture?: DocumentPictureInPicture;
  }
}
