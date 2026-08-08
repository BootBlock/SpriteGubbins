/**
 * The DOM `id` a collapsible section's `<details>` carries, derived from its section id.
 *
 * Two things need to agree on it and neither owns the other: `CollapsibleSection` writes it, and
 * `SectionToggleAll` reads it back — to name the regions it controls in `aria-controls`, and to
 * recognise that the control the user is focused on is inside a group it is about to close.
 *
 * Not `useId`, which is what every *other* id in this app comes from: those only have to be unique,
 * while this one has to be **predictable from the section id alone**, by a component that never sees
 * the element. Section ids are already namespaced and unique (`output:sheet`), so prefixing is the
 * whole derivation — the prefix exists so the value cannot collide with an id from anywhere else.
 *
 * The colon survives into the attribute: it is valid in an HTML id and in an IDREF list, and nothing
 * here selects on it with CSS, where it would need escaping.
 */
export function sectionElementId(sectionId: string): string {
  return `section-${sectionId}`;
}
