import { screen } from '@testing-library/react';
import type { ByRoleMatcher } from '@testing-library/react';

/** A control a reader can reach, and the accessible name the browser gives it. */
export interface ReachableControl {
  readonly element: HTMLElement;
  readonly name: string;
}

/**
 * Every control of the given roles that a reader can reach, with its accessible name, in role order
 * and then document order.
 *
 * **The name is the one the role query computes**, which Testing Library hands to a function
 * matcher, rather than `aria-label ?? textContent`. That shortcut reads a control named by its
 * `<label for>` as having no name at all, and a `<select>` is named exactly that way — so it could
 * not see the defect #269 reports, where every saved row's project dropdown was called “Project”.
 *
 * **A name is kept only for an element the query returns.** The query computes the name before it
 * drops the controls no reader can reach — `aria-hidden`, `hidden`, `display: none` — so the matcher
 * is called for those too. Recording every call would report a hidden control, which is not a
 * control anybody meets.
 */
export function reachableControls(roles: readonly ByRoleMatcher[]): ReachableControl[] {
  const controls: ReachableControl[] = [];
  for (const role of roles) {
    const computed = new Map<Element, string>();
    const reachable = screen.queryAllByRole(role, {
      name: (name, element) => {
        if (element !== null) computed.set(element, name);
        return true;
      },
    });
    for (const element of reachable) {
      const name = computed.get(element);
      if (name !== undefined) controls.push({ element, name });
    }
  }
  return controls;
}
