import { expect } from 'vitest';

/**
 * Controls of the icon catalogue dialog, found by the name a reader hears and then held to the role and
 * the accessible name a screen reader computes for them.
 *
 * **Why not `getByRole` over the screen.** The dialog renders every catalogue entry as a labelled
 * checkbox — over three hundred — and a screen-wide role query computes the role and the accessible name
 * of every candidate before it can match one, which costs a large fraction of a second per query there
 * and puts a suite past the test time limit on a slow runner. These narrow by the association the name
 * comes from — a `<label for>`, an `aria-label`, or a button's own text — and then assert, on the one
 * element found, the role it must have and the name the accessibility tree computes for it. A control
 * that lost its role or whose computed name no longer matches fails here; one that lost the association
 * itself is not found.
 */

/** The roles the dialog's suites look controls up by. */
export type ControlRole = 'button' | 'checkbox' | 'combobox' | 'textbox' | 'searchbox';

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

/**
 * Whether anything is named `name` at all — the absence check, which holds for every role: no element
 * a reader would hear by that name is there.
 */
export function queryControl(name: string): HTMLElement | null {
  const found = named(name);
  if (found.length > 1) throw new Error(`${String(found.length)} controls are named “${name}”`);
  return found[0] ?? null;
}

/** The one control named `name`, asserted to have `role` and that computed accessible name. */
export function control(name: string, role: ControlRole): HTMLElement {
  const found = queryControl(name);
  if (found === null) throw new Error(`No control is named “${name}”`);
  expect(found).toHaveRole(role);
  expect(found).toHaveAccessibleName(name);
  return found;
}

/** The one button whose own text is `text` and carries no `aria-label`, or `null`. */
export function queryButtonReading(text: string): HTMLButtonElement | null {
  const found = Array.from(document.querySelectorAll('button')).filter(
    (button) => !button.hasAttribute('aria-label') && button.textContent.trim() === text,
  );
  if (found.length > 1) throw new Error(`${String(found.length)} buttons read “${text}”`);
  return found[0] ?? null;
}

/** The one button reading `text`, asserted to be named by it. */
export function buttonReading(text: string): HTMLButtonElement {
  const found = queryButtonReading(text);
  if (found === null) throw new Error(`No button reads “${text}”`);
  expect(found).toHaveRole('button');
  expect(found).toHaveAccessibleName(text);
  return found;
}

/** The shelf headed by text starting `label`, asserted to be a region named by that heading. */
export function shelfHeaded(label: string): HTMLElement {
  const heading = Array.from(document.querySelectorAll('h3')).find((h3) => h3.textContent.startsWith(label));
  const shelf = heading?.closest('section');
  if (shelf === null || shelf === undefined) throw new Error(`No shelf is headed “${label}”`);
  expect(shelf).toHaveRole('region');
  expect(shelf).toHaveAccessibleName(heading?.textContent ?? '');
  return shelf;
}

/** The open form, asserted to be a form named `name`, or a failure where none is open. */
export function formNamed(name: string): HTMLFormElement {
  const form = document.querySelector('form');
  if (form === null) throw new Error('No form is open');
  expect(form).toHaveRole('form');
  expect(form).toHaveAccessibleName(name);
  return form;
}
