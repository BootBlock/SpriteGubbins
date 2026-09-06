import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import { flushSync } from 'react-dom';

/** What a browser might let the keyboard land on, before asking whether it currently would. */
const TAB_STOPS = 'a[href], button, input, select, textarea, summary, [tabindex]';

/**
 * Whether an element is still in the document and would still take focus if it were offered.
 *
 * **A negative `tabIndex` is excluded here rather than in the selector**, and the property is the
 * better instrument either way: it reports the *resolved* value, so it catches a `<button>` taken
 * out of the tab order as well as a `<div>` put into it, where an attribute selector sees only the
 * second. `ComboBox`'s chevron is the first of those — a real button the keyboard is meant to skip,
 * and handing it the focus would leave the reader somewhere their next Tab cannot return them to.
 */
function isUsable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected || element.hidden) return false;
  if (element.tabIndex < 0) return false;
  if ('disabled' in element && element.disabled === true) return false;
  return element.closest('[inert]') === null;
}

/** The tab stops on either side of the block a confirmation is about to take with it. */
interface Surroundings {
  readonly after: readonly HTMLElement[];
  readonly before: readonly HTMLElement[];
}

/**
 * Where the next Tab would have gone, recorded while the control that answers it is still there.
 *
 * The unit that disappears is the anchor's own list row where it has one, and the anchor itself
 * where it does not — a row's delete takes the whole `<li>`, while the history drawer's *Clear
 * history* takes only the pair of buttons it swapped in. Everything inside that unit is dropped from
 * both lists, because it is exactly what will not be there to receive the focus.
 *
 * Scoped to the open `<dialog>` when there is one: a modal dialog makes the rest of the document
 * inert, so a tab stop outside it is not somewhere the keyboard can go.
 */
function surroundingTabStops(anchor: HTMLElement): Surroundings | null {
  const unit = anchor.closest('li') ?? anchor;
  const scope = anchor.closest('dialog') ?? anchor.ownerDocument.body;
  const order = [...scope.querySelectorAll<HTMLElement>(TAB_STOPS)];
  const at = order.indexOf(anchor);
  if (at === -1) return null;
  const outside = (element: HTMLElement) => !unit.contains(element);
  return {
    after: order.slice(at + 1).filter(outside),
    before: order.slice(0, at).filter(outside).reverse(),
  };
}

/** A two-press confirmation, and the three places it can leave the keyboard with nowhere to be. */
export interface ConfirmInPlace {
  readonly isConfirming: boolean;
  /**
   * Put on the button that opens the confirmation. Where it survives the press, it is also where the
   * keyboard goes back to.
   *
   * **A callback rather than a ref object, and that is not a style choice.** The React Compiler's
   * `refs` rule treats a hook result whose member reaches a `ref=` prop as a ref container, and then
   * rejects every other read of that result during render — `isConfirming` included. A callback is
   * an ordinary function, which is also how `PanViewport` hands its scrollport out.
   */
  readonly attachAsk: RefCallback<HTMLButtonElement>;
  /**
   * Put on the confirmation's harmless half, which takes focus as the confirmation arrives.
   *
   * **Attached only where the ask button is being replaced.** `HistoryEntry` asks on the button
   * itself, so the element under the keyboard survives the press and moving focus would break the
   * two-press gesture — Enter, then Enter — into Enter, then cancelled.
   */
  readonly attachCancel: RefCallback<HTMLButtonElement>;
  readonly ask: () => void;
  readonly cancel: () => void;
  /**
   * Runs the destructive act and then puts the keyboard somewhere that still exists.
   *
   * The act is awaited, so pass the store call itself rather than a `void`-ed one — see the note on
   * the hook about why the answer has to have landed before the destination is chosen.
   */
  readonly confirm: (act: () => void | Promise<void>) => Promise<void>;
}

/**
 * The app's two-press confirmation, and where the keyboard lands at each of its three edges.
 *
 * Five of these are rendered — a history entry, the history drawer's footer, a saved studio preset,
 * a saved quantiser preset and a project — and every one of them answers a keypress by unmounting
 * the button that was pressed. The user agent's only fallback is `<body>`: the ring goes, the
 * position goes, and a keyboard reader's next Tab starts again from the top of the page. It happens
 * on the way *into* a confirmation, on the way out of one, and on the confirmation itself.
 *
 * **The repository already treats that as a defect in six other places**, each with the reasoning
 * written at the call site — `PresetSearchField` focuses its input before clearing the box,
 * `SectionToggleAll` moves focus to a summary before folding the group it is in,
 * `CollapsibleSection` catches the focus a collapse throws away, `PackImportConfirm` focuses Cancel
 * as the question arrives, `JsonPackTransfer` hands it back once the question is answered, and
 * `ProjectPresetRow` focuses its edit button before closing the editor. Five copies of the same
 * three-edged problem is what produced five misses, so the choreography is here and the call sites
 * carry two refs.
 *
 * **Arriving**, the confirmation's harmless half takes focus, which is `PackImportConfirm`'s answer
 * and its reason: the press that asked the question left focus on a button this replaces, and
 * landing on Cancel is what makes a stray Enter safe.
 *
 * **Cancelling**, the keyboard goes back to the ask button — which does not exist at the moment
 * Cancel is pressed, so it is waited for rather than aimed at. That is `JsonPackTransfer`'s shape:
 * a ref and an effect with no dependency list, waiting for a button both mounted *and* enabled,
 * because the render a destination is ready on is not a value any render can name.
 *
 * **Confirming**, the ask button may not come back at all — the row it was in has gone — or may come
 * back unusable, which is the history drawer's *Clear history* returning `disabled` the moment the
 * collection it counts is empty. So the destination is **where the next Tab would have gone**: the
 * first tab stop after the departed block that is still usable, and failing that the nearest one
 * before it. Those two lists are captured before the act runs, while the block is still there to
 * measure; which of them is usable is asked afterwards, when the page has settled.
 *
 * **The act is awaited and the commit is flushed for that reason.** A store write that has been
 * started but not finished leaves the page one render short of the truth — the last history row is
 * still on screen and the footer's two buttons are both still enabled — so a destination chosen then
 * is a control that is about to be disabled, and Chromium drops focus to `<body>` the moment it is.
 */
export function useConfirmInPlace(): ConfirmInPlace {
  const [isConfirming, setIsConfirming] = useState(false);
  const askRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  // Memoised, so React is not detaching and re-attaching the ref on every render — `PanViewport`'s
  // reason for the same shape.
  const attachAsk = useCallback((element: HTMLButtonElement | null) => {
    askRef.current = element;
  }, []);
  const attachCancel = useCallback((element: HTMLButtonElement | null) => {
    cancelRef.current = element;
  }, []);
  /** Set while the keyboard is owed the ask button, which may take more than one render to arrive. */
  const isReturningToAsk = useRef(false);

  // Arriving. Keyed on the state rather than on a debt, because the confirmation is mounted by the
  // very commit this change produces — and a `cancelRef` still empty then is a call site that
  // deliberately attached none.
  useEffect(() => {
    if (!isConfirming) return;
    cancelRef.current?.focus();
  }, [isConfirming]);

  // Cancelling. A ref rather than state and no dependency list, which is `JsonPackTransfer`'s shape
  // and its reason: the debt is taken on in an event handler and paid on whichever later render the
  // ask button is both mounted and enabled on, which is not a value any render can name.
  useEffect(() => {
    if (!isReturningToAsk.current) return;
    const ask = askRef.current;
    if (ask === null || !isUsable(ask)) return;
    isReturningToAsk.current = false;
    ask.focus();
  });

  function ask(): void {
    setIsConfirming(true);
  }

  function cancel(): void {
    isReturningToAsk.current = true;
    setIsConfirming(false);
  }

  async function confirm(act: () => void | Promise<void>): Promise<void> {
    // The Cancel button where the confirmation swapped the row out, and the ask button where it
    // asked on the button itself — either way, the control the press was aimed at.
    const anchor = cancelRef.current ?? askRef.current;
    const around = anchor === null ? null : surroundingTabStops(anchor);
    await act();
    // **Flushed here rather than answered by an effect**, and that is not an optimisation. Three of
    // the five call sites are a list row, and the act destroys the row — so this component is one of
    // the things that has gone, and no effect of its own will ever run again. Flushing commits the
    // store's removal together with this state change, which is what lets the destination below be
    // chosen from the page as it actually is: the row gone, and the collection-wide controls already
    // `disabled` where emptying the collection is what disables them.
    flushSync(() => {
      setIsConfirming(false);
    });
    const ask = askRef.current;
    const destination =
      (ask !== null && isUsable(ask) ? ask : null) ??
      around?.after.find(isUsable) ??
      around?.before.find(isUsable);
    destination?.focus();
  }

  return { isConfirming, attachAsk, attachCancel, ask, cancel, confirm };
}
