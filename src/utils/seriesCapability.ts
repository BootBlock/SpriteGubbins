import type { SheetBatch } from './sheetBatch.ts';

/** A run of consecutive sheets that assemble into the same thing, numbered from one. */
interface CapabilityRun {
  readonly assembly: string;
  readonly from: number;
  to: number;
}

/**
 * The batch's sheets grouped into runs that assemble into the same thing.
 *
 * **One relation, read twice**, which is the whole reason this is a function rather than two.
 * Section 6 asks two questions of a batch — whether its sheets state one capability between them,
 * and what those capabilities are — and they are the same question. Answering them separately is
 * how the section came to deny a claim and then make it: the flag compared plan *objects* while the
 * bullets grouped on the assembly *sentence*, and an eight-compass OBJECT, ITEM, BUILDING or VEHICLE
 * core is two plans built by one factory, so it took the branch saying “that is not the series’
 * capability” and then stated the series' capability as the same sentence, verbatim.
 *
 * Grouped on the sentence, because the sentence is what the reader is shown: two plans that
 * assemble into the same thing deliver one capability however many objects the plan table holds.
 * The runs are contiguous by construction — `sheetBatch` emits every sheet of one plan adjacently —
 * so a run is a range of sheet numbers rather than a set.
 */
function capabilityRuns(batch: SheetBatch): readonly CapabilityRun[] {
  const runs: CapabilityRun[] = [];

  batch.sheets.forEach((sheet, index) => {
    const open = runs.at(-1);
    if (open !== undefined && open.assembly === sheet.plan.assembly) open.to = index + 1;
    else runs.push({ assembly: sheet.plan.assembly, from: index + 1, to: index + 1 });
  });

  return runs;
}

/**
 * Whether every sheet of this batch delivers the same assembly answer, over the facings it covers.
 *
 * **The question section 6's claim turns on.** `SheetPlan.assembly` completes “The component set
 * must assemble cleanly into: …”, and it is declared on the *plan* — so it can only ever answer for
 * one sheet. Section 6 then labelled it “the finished series’ capability”, which is true of one
 * batch shape and false of the other, and the prompt contradicted itself two lines later where the
 * sheet list showed ten sheets carrying three different answers between them.
 *
 * A batch that states one answer is a `'run'` sheet expanded once per facing — a cut-out rig, a pose
 * library, an effect's frame sequence — or a directional core split by yaw parity into a cardinal
 * and a diagonal sheet. Each of those sheets delivers the stated capability over the facings it
 * covers, and the series is that same capability over all of them. A batch of several answers is the
 * series axis instead: a character's two directional cores and its eight articulation sheets are
 * three inventories and two answers, and neither sentence describes what the ten assemble into.
 */
export function seriesStatesOneCapability(batch: SheetBatch): boolean {
  return capabilityRuns(batch).length === 1;
}

/**
 * What the finished series assembles into, as one bullet per distinct answer the batch holds.
 *
 * Derived from the batch the way `describeSeries` derives the sheet list beside it, and for the same
 * reason: a series' capability written down anywhere else is a fact stated twice, and the copy that
 * is not the plans goes stale the moment a sheet is added. The sheet numbers are the reader's route
 * back to the list below, which is where each sheet's own facings are named.
 *
 * **Only a batch with more than one answer renders this**, gated in the template on
 * {@link seriesStatesOneCapability} — which reads the same runs, so the block can never restate the
 * sentence the branch above it just set aside.
 *
 * The plan sentences are facing-neutral for this to be quotable at all. They read “each of the
 * directions the sheet covers” rather than “listed above”, because *above* resolves to section 3 of
 * the prompt being compiled — so an articulation sheet quoting its core sheet's answer would have
 * claimed the core covered the one facing this sheet draws.
 */
export function describeSeriesCapability(batch: SheetBatch): string {
  return capabilityRuns(batch)
    .map(({ assembly, from, to }) => {
      const label = from === to ? `Sheet ${String(from)}` : `Sheets ${String(from)}–${String(to)}`;
      return `- **${label}**: ${assembly}`;
    })
    .join('\n');
}
