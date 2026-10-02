/**
 * Controls of the icon catalogue dialog, found by the name a reader hears, without a role query.
 *
 * **Why not `getByRole`.** The dialog renders every catalogue entry as a labelled checkbox — over three
 * hundred — and a role query computes the accessible name of every candidate in the document before it
 * can match one, which costs a large fraction of a second per query there and puts a suite past the test
 * time limit on a slow runner. These look up the same association a screen reader follows, a
 * `<label for>` or an `aria-label`, so a control that lost its name would still not be found.
 */

/** Every element named `name` by a `<label for>` reading exactly that, or by its own `aria-label`. */
function named(name: string): HTMLElement[] {
  const byLabel = Array.from(document.querySelectorAll('label'))
    .filter((label) => label.textContent.trim() === name && label.htmlFor !== '')
    .map((label) => document.getElementById(label.htmlFor))
    .filter((control) => control !== null);
  const byAria = Array.from(document.querySelectorAll<HTMLElement>('[aria-label]')).filter(
    (element) => element.getAttribute('aria-label') === name,
  );
  return [...byLabel, ...byAria];
}

/** The one control named `name`, or `null` where there is none; more than one is an error. */
export function queryControl(name: string): HTMLElement | null {
  const found = named(name);
  if (found.length > 1) throw new Error(`${String(found.length)} controls are named “${name}”`);
  return found[0] ?? null;
}

/** The one control named `name`. */
export function control(name: string): HTMLElement {
  const found = queryControl(name);
  if (found === null) throw new Error(`No control is named “${name}”`);
  return found;
}

/** The one button whose own text is `text` — for a button its text names, with no `aria-label`. */
export function queryButtonReading(text: string): HTMLButtonElement | null {
  const found = Array.from(document.querySelectorAll('button')).filter(
    (button) => !button.hasAttribute('aria-label') && button.textContent.trim() === text,
  );
  if (found.length > 1) throw new Error(`${String(found.length)} buttons read “${text}”`);
  return found[0] ?? null;
}

/** The one button whose own text is `text`. */
export function buttonReading(text: string): HTMLButtonElement {
  const found = queryButtonReading(text);
  if (found === null) throw new Error(`No button reads “${text}”`);
  return found;
}

/** The shelf headed by text starting `label`. */
export function shelfHeaded(label: string): HTMLElement {
  const heading = Array.from(document.querySelectorAll('h3')).find((h3) => h3.textContent.startsWith(label));
  const shelf = heading?.closest('section');
  if (shelf === null || shelf === undefined) throw new Error(`No shelf is headed “${label}”`);
  return shelf;
}
