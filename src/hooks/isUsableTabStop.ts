/**
 * Whether an element is still in the document and would still take focus if it were offered.
 *
 * **It lives in `src/hooks/` without being a hook**, as `isTextEntry` does and for its reason: it
 * reads the DOM, so `src/utils/` is closed to it. `useConfirmInPlace` asks it while waiting for a
 * button to come back, and `keepFocusThrough` asks it of every candidate destination.
 *
 * **A negative `tabIndex` is excluded here rather than in a selector**, and the property is the
 * better instrument either way: it reports the *resolved* value, so it catches a `<button>` taken
 * out of the tab order as well as a `<div>` put into it, where an attribute selector sees only the
 * second. `ComboBox`'s chevron is the first of those — a real button the keyboard is meant to skip,
 * and handing it the focus would leave the reader somewhere their next Tab cannot return them to.
 */
export function isUsableTabStop(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected || element.hidden) return false;
  if (element.tabIndex < 0) return false;
  if ('disabled' in element && element.disabled === true) return false;
  return element.closest('[inert]') === null;
}
