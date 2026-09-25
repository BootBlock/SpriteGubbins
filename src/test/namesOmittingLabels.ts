import { reachableControls } from './reachableControls.ts';

/**
 * The roles whose name a reader expects to be the words on the control. A field is named by the label
 * beside it rather than by its content, so a `<select>`'s option text is not what anybody says to it.
 */
const LABELLED_ROLES = ['button', 'link'] as const;

/**
 * Every reachable button or link whose accessible name does not open with the words it shows, as
 * `label → name` — so a page that names its controls properly returns an empty array.
 *
 * WCAG 2.5.3, Label in Name: someone driving the app by speech says what they can see, so a Cancel
 * button named “Keep the saved settings …” is a button “click Cancel” never reaches. The criterion
 * asks only that the name contain the label; the app holds itself to the name *starting* with it,
 * which is the form the criterion recommends and the one every qualified name here already takes
 * (`Cancel — keep the project …`, `Copy prompt — …`).
 *
 * **The visible label is the text content less anything `aria-hidden`**, which is how the app marks a
 * decorative glyph — the ⬇ before a download, the ⓘ's `i`. A control that shows no letter or digit
 * once those are gone is an icon button, whose name has no words on screen to match.
 *
 * **The comparison ignores case and whitespace altogether.** Speech input ignores case, and the
 * spacing of the two strings cannot be compared: `textContent` runs adjacent elements together,
 * so a project button showing `Harbour` beside a count of `4` reads `Harbour4`, while the name the
 * browser computes from the same content is `Harbour 4`. The name is the one `reachableControls`
 * reads off the role query.
 */
export function namesOmittingLabels(): string[] {
  const misses: string[] = [];
  for (const { element, name } of reachableControls(LABELLED_ROLES)) {
    const label = visibleLabel(element);
    if (!/[\p{L}\p{N}]/u.test(label)) continue;
    if (!normalise(name).startsWith(normalise(label))) misses.push(`${label} → ${name}`);
  }
  return misses;
}

function visibleLabel(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function normalise(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}
