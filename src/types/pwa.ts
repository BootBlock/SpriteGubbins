/**
 * The install-prompt event, typed.
 *
 * `beforeinstallprompt` is a Chromium extension to the web platform, not a standard, so
 * TypeScript's DOM library does not declare it — which is exactly why the specification reached
 * for `any` here. `any` is banned, and a hand-written declaration is not a workaround for that ban
 * but the correct answer: the app touches precisely three members, and declaring them is how
 * calling `prompt()` on a plain `Event` becomes a compile error rather than a runtime one.
 *
 * Declared against the Chromium behaviour: the event fires when the browser judges the app
 * installable, `preventDefault()` suppresses its own mini-infobar so the app can offer the install
 * at a moment of its choosing, and the deferred event stays usable until it is spent.
 */
export interface BeforeInstallPromptEvent extends Event {
  /** The install surfaces available, e.g. `['web']`. Informational; the app does not branch on it. */
  readonly platforms: readonly string[];

  /** Resolves once the user has accepted or dismissed the browser's own install dialogue. */
  readonly userChoice: Promise<BeforeInstallPromptChoice>;

  /** Show the browser's install dialogue. Usable once — a spent event must be discarded. */
  prompt(): Promise<void>;
}

export interface BeforeInstallPromptChoice {
  readonly outcome: 'accepted' | 'dismissed';
  readonly platform: string;
}

/**
 * Teach `addEventListener` the event's name, so the listener's argument arrives already narrowed.
 *
 * Without this the handler would receive a bare `Event` and reaching `prompt()` would need a cast
 * or a type guard — both of which this replaces with something the compiler checks at the one
 * place that matters, the registration site.
 */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
