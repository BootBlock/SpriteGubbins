/**
 * Whether an event landed in a control that edits text of its own.
 *
 * Two window-wide listeners have to answer this before they act, and the reasons look unrelated
 * until they are written down: `useUndoShortcut` must not take Ctrl+Z off a box that has a native
 * undo stack of its own, and `useFileDropGuard` must not refuse a drag carrying no file where the
 * browser's default action is to insert what it carries. Both are asking whether the reader is in
 * something that edits text, so the question is answered once here rather than twice.
 *
 * **It lives in `src/hooks/` without being a hook.** That directory exists because `src/utils/` is
 * kept pure and this predicate is not — it reads the DOM — and it is not a component either. So it
 * sits beside the two hooks that share it, filed under the name it exports, as everything else here
 * is.
 *
 * Text entry only, which is narrower than "an input": a range slider and a select are both form
 * controls, and neither has a stack for the shortcut to belong to nor anywhere to put dropped text.
 * Seventeen of the quantiser's twenty dials are one or the other. A `type` a browser does not know
 * falls back to `text`, so an unknown one is treated as text entry — the safe direction for the
 * shortcut, since the cost of being wrong that way is a shortcut that does nothing rather than one
 * that eats a reader's typing.
 *
 * **A control that will not take typing is not text entry either, whatever kind it is.** `readOnly`
 * and `disabled` both refuse an edit outright, so neither control has an undo stack to protect and
 * neither will accept a dropped link — the browser hands such a drag on to the document's own
 * default action, which is the navigation the guard exists to stop. `NumberField` is why this is not
 * hypothetical: it renders its unavailable state as `aria-disabled` **with `readOnly`**, keeping the
 * control in the tab order on purpose, so the Quantise tab genuinely shows read-only number boxes a
 * drag can land on — and a reader can focus one.
 *
 * **That answer reaches the shortcut too, and it is the answer the shortcut wants.** Ctrl+Z in a
 * focused read-only box used to do nothing at all: this predicate said text entry, `useUndoShortcut`
 * stood aside, and the native stack it stood aside for does not exist, because nothing in that box
 * was ever edited. The shortcut now runs the tab's own undo there, which is the only undo in reach.
 *
 * **The realm is the caller's, never this module's.** `instanceof` compares against one realm's
 * constructors, and an element in a window this app opened is built from that window's — so a bare
 * `target instanceof HTMLInputElement` would answer `false` for every control in the detached
 * preview `useDetachedWindow` opens, which `useFileDropGuard` guards as well as the page. That
 * panel holds no box which edits text today, so nothing observable turns on it and this is a
 * property being kept rather than a fault being fixed. It is kept because the day one appears the
 * failure is silent: the guard would refuse a drag that field could have taken, and nothing about
 * the window would say why. The constructors are therefore read off the window the listener was
 * registered on, and `view.self` is what reaches them — lib.dom declares each of them as a global
 * rather than as a member of `Window`, so a plain `Window` has no typed route to its own realm
 * except through `self`, which is that window again.
 *
 * **Measured in Edge, against a `window.open` popup — the route `useDetachedWindow` falls back to —
 * and against a same-origin iframe.** In both, the second window's `HTMLInputElement` is a different
 * object from the opener's, a text input built in there is not `instanceof` the opener's, and this
 * predicate answers `true` handed that window and `false` handed the opener's. The unit tests cannot
 * assert any of it: happy-dom's element classes are module singletons, so every window it builds
 * reports the same constructors and a test written for the realm would pass against a bare
 * `instanceof` too.
 */
export function isTextEntry(target: EventTarget | null, view: Window): boolean {
  const realm = view.self;
  if (target instanceof realm.HTMLTextAreaElement) return acceptsTyping(target);
  if (target instanceof realm.HTMLElement && target.isContentEditable) return true;
  if (!(target instanceof realm.HTMLInputElement)) return false;
  return acceptsTyping(target) && !NON_TEXT_INPUT_TYPES.has(target.type);
}

/** Whether a text control will take what is typed or dropped into it, rather than refusing it. */
function acceptsTyping(control: HTMLInputElement | HTMLTextAreaElement): boolean {
  return !control.readOnly && !control.disabled;
}

/** The input types that hold no text, and so have no undo of their own and no use for a drop. */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);
