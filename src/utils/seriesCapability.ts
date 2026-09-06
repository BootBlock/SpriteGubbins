import type { SheetBatch } from './sheetBatch.ts';

/**
 * Whether every sheet of this batch delivers the same assembly answer, at its own facing.
 *
 * **The question section 6's claim turns on.** `SheetPlan.assembly` completes “The component set
 * must assemble cleanly into: …”, and it is declared on the *plan* — so it can only ever answer for
 * one sheet. Section 6 then labelled it “the finished series’ capability”, which is true of one
 * batch shape and false of the other, and the prompt contradicted itself two lines later where the
 * sheet list showed ten sheets carrying three different answers between them.
 *
 * A batch of one plan is a `'run'` sheet expanded once per facing of the chosen set — a cut-out rig,
 * a pose library, an effect's frame sequence — so every sheet holds the same inventory and delivers
 * the same capability at a facing of its own. A batch of several plans is the series axis instead: a
 * character's two directional cores and its eight articulation sheets are three different
 * inventories, and no one of their sentences describes what the ten assemble into.
 *
 * Compared on the plan rather than on the sentence, because two plans may share a wording and still
 * be different sheets: an eight-compass core is a cardinal plan and a diagonal plan whose assembly
 * sentences are the same string.
 */
export function seriesStatesOneCapability(batch: SheetBatch): boolean {
  return new Set(batch.sheets.map((sheet) => sheet.plan)).size === 1;
}

/**
 * What the finished series assembles into, as one bullet per distinct answer the batch holds.
 *
 * Derived from the batch the way `describeSeries` derives the sheet list beside it, and for the same
 * reason: a series' capability written down anywhere else is a fact stated twice, and the copy that
 * is not the plans goes stale the moment a sheet is added. Contiguous sheets sharing an answer are
 * grouped, so a ten-sheet character series states two bullets rather than ten, and the sheet numbers
 * are the reader's route back to the list below — which is where each sheet's own facings are named.
 *
 * **Only a multi-plan batch renders this**, gated in the template on
 * {@link seriesStatesOneCapability}: where every sheet delivers the same answer, a bullet restating
 * the sentence directly above it would say nothing the paragraph does not.
 *
 * The plan sentences are facing-neutral for this to be quotable at all. They read “each of the
 * directions the sheet covers” rather than “listed above”, because *above* resolves to section 3 of
 * the prompt being compiled — so an articulation sheet quoting its core sheet's answer would have
 * claimed the core covered the one facing this sheet draws.
 */
export function describeSeriesCapability(batch: SheetBatch): string {
  const groups: { readonly assembly: string; from: number; to: number }[] = [];

  batch.sheets.forEach((sheet, index) => {
    const open = groups.at(-1);
    if (open !== undefined && open.assembly === sheet.plan.assembly) open.to = index + 1;
    else groups.push({ assembly: sheet.plan.assembly, from: index + 1, to: index + 1 });
  });

  return groups
    .map(({ assembly, from, to }) => {
      const label = from === to ? `Sheet ${String(from)}` : `Sheets ${String(from)}–${String(to)}`;
      return `- **${label}**: ${assembly}`;
    })
    .join('\n');
}
