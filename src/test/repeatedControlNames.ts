import { screen } from '@testing-library/react';

/**
 * The roles a reader moves between one control at a time — by Tab, by a screen reader's list of
 * form controls, or by saying a name aloud to speech input — so the ones whose names have to tell
 * each other apart.
 *
 * `option` is left out on purpose. Every project dropdown offers the same project names, and an
 * option is only ever met inside the control that names it, never on its own.
 */
const CONTROL_ROLES = [
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'combobox',
  'listbox',
  'textbox',
  'searchbox',
  'spinbutton',
  'slider',
] as const;

/**
 * Every accessible name that more than one control on screen carries, once for each extra copy — so
 * a list that names its controls properly returns an empty array.
 *
 * **The name is the one the role query computes**, which Testing Library hands to a function
 * matcher, rather than `aria-label ?? textContent`. That shortcut reads a control named by its
 * `<label for>` as having no name at all, and a `<select>` is named exactly that way — so it could
 * not see the defect #269 reports, where every saved row's project dropdown was called “Project”.
 * The matcher accepts every element, so this reads names and filters nothing.
 */
export function repeatedControlNames(): string[] {
  const names: string[] = [];
  for (const role of CONTROL_ROLES) {
    screen.queryAllByRole(role, {
      name: (name) => {
        names.push(name);
        return true;
      },
    });
  }
  return names.filter((name, index) => names.indexOf(name) !== index);
}
