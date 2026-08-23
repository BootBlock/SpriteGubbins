import { resolveMode } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { sheetComponentCount } from './componentSet.ts';
import { componentSlots } from './componentSlots.ts';
import { sheetBatch } from './sheetBatch.ts';
import type { BatchSheet } from './sheetBatch.ts';
import { slugify } from './slugify.ts';

/**
 * What the studio says the sheet in the Quantise tab is, for everything a download records.
 *
 * **The bookkeeping a ten-generation character otherwise leaves to the reader.** An eight-compass
 * character is two core sheets and eight articulation runs, each generated separately, each arriving
 * as its own file named after whatever the browser saved — and until this reached the manifest,
 * nothing in any of those files said which sheet of which subject it held. The names are the other
 * half: section 4 fixes the inventory and the reading order, so the *n*th sprite is the *n*th
 * component, and `componentSlots` is what turns that into a list. The facing is the third: it names
 * the file the download arrives as and the directory a sprite pack lays its pieces out in, which is
 * what tells eight rig runs apart on disk.
 *
 * **It is a statement about the studio, never a claim about the image.** Nothing can check that the
 * dropped sheet is the one the studio is composing — a reader may be quantising a sheet from last
 * week — so the guidance behind the download says outright that this records the configuration on
 * screen at the moment the file was written.
 *
 * Pure, as everything in this directory is: the two stores are read at the call site and their values
 * handed in, which is what keeps the batch walk and the inventory expansion testable without React.
 */

/** The names for this sheet's components, the facing that identifies it, and its place in its batch. */
export interface SheetIdentity {
  /** One name per component the prompt asks for, in the order section 4 lays them out. */
  readonly names: readonly string[];
  /**
   * The facing that tells this sheet apart from the rest of its batch, slugged — or `null` where no
   * facing does.
   *
   * **What a download is named and laid out by.** Eight cut-out rig runs are eight archives of
   * fifteen identically-named files, so until this reached the writer the only thing keeping the
   * south sheet's hand apart from the west sheet's was which folder the reader unzipped it into. A
   * facing is the word an engine importer's tree is keyed by, which is why it is preferred to the
   * ordinal wherever a sheet has one.
   *
   * **A facing only names a sheet where it distinguishes one**, and three cases say it does not: a
   * batch of a single sheet has nothing to tell apart, a sheet drawing several facings is not any
   * one of them, and two sheets drawing the same lone facing — a directional core and its
   * articulation, both at `front` on a single-direction set — would be given one name twice. The
   * download falls back to the ordinal in each, which every batch has and no two sheets share.
   */
  readonly facing: string | null;
  /**
   * The sheet's own place in its batch, or `null` where the batch does not hold the position it
   * resolved to — a contract `sheetBatch` keeps, checked rather than assumed because it is an index.
   */
  readonly sheet: ManifestSheet | null;
}

/**
 * The one facing this sheet draws, where no other sheet of the batch draws that facing alone.
 *
 * Read off the batch rather than off the sheet, because whether a facing *identifies* anything is a
 * property of the set it sits in: `south` names one of eight rig runs and names nothing at all on a
 * tileset, and the sheet itself cannot tell those apart. Compared by identity against the entry the
 * ordinal picked out, so a batch that did hold two sheets at one facing withholds the name from both
 * rather than from whichever was looked at second.
 */
function distinguishingFacing(sheets: readonly BatchSheet[], current: BatchSheet): string | null {
  if (sheets.length < 2 || current.covered.length !== 1) return null;
  const [only] = current.covered;
  const shared = sheets.some(
    (sheet) => sheet !== current && sheet.covered.length === 1 && sheet.covered[0] === only,
  );
  return shared ? null : slugify(only);
}

export function sheetIdentity(
  category: SubjectCategory,
  output: OutputConfig,
  additionalAnatomy: string,
): SheetIdentity {
  const anatomy = parseAdditionalAnatomy(additionalAnatomy);
  // The same enumeration the split drawer and the studio's batch strip read, so the ordinal in a
  // manifest and the "Sheet N of M" on screen are one position in one list rather than two counts
  // that happen to agree.
  const { sheets, ordinal } = sheetBatch(category, output);
  const current = sheets[ordinal - 1];
  if (current === undefined) return { names: [], facing: null, sheet: null };

  // **Both halves are read off the same batch sheet**, rather than one from it and one from the
  // studio's stored fields. Those agree in every reachable state — the ordinal is derived from
  // exactly those fields — and reading one of each would make that agreement an assumption rather
  // than a construction, on the very pair whose lengths a manifest's names depend on matching.
  const mode = resolveMode(category, current.output.directionalMode);

  return {
    names: componentSlots(category, mode, current.output.directions, current.output.sheetIndex, anatomy),
    facing: distinguishingFacing(sheets, current),
    sheet: {
      category,
      plan: current.plan.name,
      ordinal,
      total: sheets.length,
      facings: current.covered,
      assembly: current.assembly,
      components: sheetComponentCount(category, current, anatomy),
    },
  };
}
