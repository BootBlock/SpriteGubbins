import { flushSync } from 'react-dom';
import { isUsableTabStop } from './isUsableTabStop.ts';

/** What a browser might let the keyboard land on, before asking whether it currently would. */
const TAB_STOPS = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** The tab stops on either side of the block an act is about to take with it. */
interface Surroundings {
  readonly after: readonly HTMLElement[];
  readonly before: readonly HTMLElement[];
}

/**
 * Where the next Tab would have gone, recorded while the control that was pressed is still there.
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

/** One act that may take the pressed control, and its row, off the page. */
interface FocusedAct {
  /** The control the press was aimed at, measured before the act runs. `null` measures nothing. */
  readonly anchor: HTMLElement | null;
  /** The store write. Awaited, so pass the call itself rather than a `void`-ed one. */
  readonly act: () => void | Promise<void>;
  /** The caller's own state change that closes what the press opened, committed with the act's. */
  readonly settle: () => void;
  /**
   * Where the keyboard goes first if it is still there once the page has settled — read *after*
   * the commit, which is why it is a function rather than an element.
   */
  readonly home: () => HTMLElement | null;
}

/**
 * Runs an act that can unmount the control that asked for it, and then puts the keyboard somewhere
 * that still exists.
 *
 * Two families of control need this. A confirmation answered in place (`useConfirmInPlace`) and a
 * saved row re-filed into another project (`ProjectMoveField`) both answer a keypress by removing
 * the button that was pressed — often with the whole row, when the list is filtered to one project
 * or the record is gone. The user agent's only fallback is `<body>`: the ring goes, the position
 * goes, and a keyboard reader's next Tab starts again from the top of the page.
 *
 * The destination is `home` where it survived and can take focus, and otherwise **where the next
 * Tab would have gone**: the first tab stop after the departed block that is still usable, and
 * failing that the nearest one before it. Those two lists are captured before the act runs, while
 * the block is still there to measure; which of them is usable is asked afterwards.
 *
 * **The act is awaited and the commit is flushed**, and that is not an optimisation. A store write
 * that has been started but not finished leaves the page one render short of the truth — the last
 * history row is still on screen and the footer's two buttons are both still enabled — so a
 * destination chosen then is a control about to be disabled, and Chromium drops focus to `<body>`
 * the moment it is. And where the act destroys the caller's row, no effect of the caller's will ever
 * run again, so the answer cannot wait for one: flushing commits the store's change together with
 * `settle`, and the destination is chosen from the page as it actually is.
 */
export async function keepFocusThrough({ anchor, act, settle, home }: FocusedAct): Promise<void> {
  const around = anchor === null ? null : surroundingTabStops(anchor);
  await act();
  flushSync(settle);
  const first = home();
  const destination =
    (first !== null && isUsableTabStop(first) ? first : null) ??
    around?.after.find(isUsableTabStop) ??
    around?.before.find(isUsableTabStop);
  destination?.focus();
}
