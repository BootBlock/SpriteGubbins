/**
 * Additional anatomy: the pieces a subject names beyond its category's own inventory.
 *
 * v2's section 1 declared such anatomy to be *separate pieces* while section 0 demanded exactly N
 * components and section 4 listed exactly N, so a subject with a tail asked for more pieces than it
 * counted. Counting the field is what reconciles them, and a count is only possible if each named
 * piece carries one — "a mechanical wing pair" is one phrase and two components, and reading the
 * words to guess which is exactly the silently-wrong sheet the component count exists to catch.
 */

/** One named piece of extra anatomy, and how many of it the sheet draws. */
export interface AnatomyComponent {
  readonly name: string;
  readonly count: number;
}
