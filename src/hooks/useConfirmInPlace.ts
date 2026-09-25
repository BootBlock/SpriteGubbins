import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';
import { isUsableTabStop } from './isUsableTabStop.ts';
import { keepFocusThrough } from './keepFocusThrough.ts';

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
   * The act is awaited, so pass the store call itself rather than a `void`-ed one — see
   * `keepFocusThrough` about why the answer has to have landed before the destination is chosen.
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
 * **Those six are cited, not superseded, and two of them are worth saying why about.**
 * `PackImportConfirm` and `JsonPackTransfer` are the arriving and leaving halves of this same
 * choreography, and the code here is theirs — but they are a *staged import* rather than a row's
 * two-press question: the state that decides whether the confirmation is showing is a pending import
 * held in a store, and it is read by two sibling components rather than one. This hook owns
 * `isConfirming` itself, which is what the five call sites need and what those two cannot use.
 * Making it accept externally-driven state as well would be a knob added for one caller, which is
 * the speculative generality the same rulebook bans. The other four are single-edge moves — a focus
 * handed on before a state change, or caught after one — and are not this shape at all.
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
 * collection it counts is empty. So the keyboard goes to **where the next Tab would have gone**,
 * which `keepFocusThrough` works out: it is shared with `ProjectMoveField`, whose Move button takes
 * its row out of a filtered list in exactly this way.
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
    if (ask === null || !isUsableTabStop(ask)) return;
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
    await keepFocusThrough({
      // The Cancel button where the confirmation swapped the row out, and the ask button where it
      // asked on the button itself — either way, the control the press was aimed at.
      anchor: cancelRef.current ?? askRef.current,
      act,
      settle: () => {
        setIsConfirming(false);
      },
      home: () => askRef.current,
    });
  }

  return { isConfirming, attachAsk, attachCancel, ask, cancel, confirm };
}
