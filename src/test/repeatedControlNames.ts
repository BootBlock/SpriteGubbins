import { reachableControls } from './reachableControls.ts';

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
 * Every accessible name that more than one reachable control carries, once for each extra copy — so
 * a list that names its controls properly returns an empty array. Only reachable controls count, so
 * a hidden control that shares a visible one's name is not a repeat — see `reachableControls`.
 */
export function repeatedControlNames(): string[] {
  const names = reachableControls(CONTROL_ROLES).map((control) => control.name);
  return names.filter((name, index) => names.indexOf(name) !== index);
}
