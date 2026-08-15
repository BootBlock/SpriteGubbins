/**
 * One numbered section of a compiled prompt, sliced out by its heading's title.
 *
 * Section numbers are computed from the headings a configuration actually carries, so a literal
 * `## 8. EXCLUSIONS` is right only for the categories that also carry a rig section — the five that
 * articulate about nothing put their exclusions at 7. Slicing by title is what lets an assertion say
 * *which section* a sentence landed in without re-deriving the arithmetic `applySectionNumbers`
 * already does; the alternative, previously written out by hand, was a disjunction over the two
 * numbers a following heading could take.
 *
 * `\n## ` terminates rather than the `---` rule, because a section's own sub-headings are three
 * hashes or four and the rule is not present between every pair. The end of the *prompt* is spelled
 * `(?![\s\S])` rather than `$`, which under the `m` flag needed for `^` would mean the end of the
 * heading's own line and match every section as its heading alone.
 *
 * Shared from here rather than restated in each suite that wants it: `sheetPlans.test.ts` slices the
 * inventory and the exclusions to check that neither demands what the other forbids, and
 * `promptCompiler.test.ts` slices the exclusions to check that its own precedence paragraph is
 * inside it. A second copy of this regex is a second place for the two conditional sections to be
 * got wrong.
 */
export function sectionOf(prompt: string, title: string): string {
  const pattern = String.raw`^## \d+\. ${title}$[\s\S]*?(?=\n## |(?![\s\S]))`;
  return new RegExp(pattern, 'm').exec(prompt)?.[0] ?? '';
}
