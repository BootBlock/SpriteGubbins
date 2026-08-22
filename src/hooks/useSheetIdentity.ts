import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import { parseAdditionalAnatomy } from '../utils/additionalAnatomy.ts';
import { componentSlots } from '../utils/componentSlots.ts';
import { sheetComponentCount } from '../utils/componentSet.ts';
import { resolveMode } from '../constants/sheetPlans/index.ts';
import { sheetBatch } from '../utils/sheetBatch.ts';

/**
 * What the studio says the sheet in the Quantise tab is, for the manifest a download writes.
 *
 * **The bookkeeping a ten-generation character otherwise leaves to the reader.** An eight-compass
 * character is two core sheets and eight articulation runs, each generated separately, each arriving
 * as its own file named after whatever the browser saved — and until this reached the manifest,
 * nothing in any of those files said which sheet of which subject it held. The names are the other
 * half: section 4 fixes the inventory and the reading order, so the *n*th sprite is the *n*th
 * component, and `componentSlots` is what turns that into a list.
 *
 * **A hook rather than two store reads at the call site**, and rather than a prop drilled from the
 * tab. `DownloadControls` sits three components below `QuantiseTab`, so passing this down would
 * thread it through two panels that have no use for it — and reading it in the button's own
 * component would put a batch enumeration and an inventory walk in a file about writing a file. It
 * needs React and two stores, so `src/utils/` is closed to it; this is what `src/hooks/` is for.
 *
 * **It is a statement about the studio, never a claim about the image.** Nothing can check that the
 * dropped sheet is the one the studio is composing — a reader may be quantising a sheet from last
 * week — so the guidance behind the download says outright that this records the configuration on
 * screen at the moment the file was written.
 */

/** The names for this sheet's components, and the sheet's own place in its batch. */
export interface SheetIdentity {
  /** One name per component the prompt asks for, in the order section 4 lays them out. */
  readonly names: readonly string[];
  /**
   * The sheet's own place in its batch, or `null` where the batch does not hold the position it
   * resolved to — a contract `sheetBatch` keeps, checked rather than assumed because it is an index.
   */
  readonly sheet: ManifestSheet | null;
}

export function useSheetIdentity(): SheetIdentity {
  const category = useSubjectStore((state) => state.category);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const output = useOutputStore((state) => state.output);

  return useMemo(() => {
    const anatomy = parseAdditionalAnatomy(additionalAnatomy);
    // The same enumeration the split drawer and the studio's batch strip read, so the ordinal in a
    // manifest and the "Sheet N of M" on screen are one position in one list rather than two counts
    // that happen to agree.
    const { sheets, ordinal } = sheetBatch(category, output);
    const current = sheets[ordinal - 1];
    if (current === undefined) return { names: [], sheet: null };

    // **Both halves are read off the same batch sheet**, rather than one from it and one from the
    // studio's stored fields. Those agree in every reachable state — the ordinal is derived from
    // exactly those fields — and reading one of each would make that agreement an assumption rather
    // than a construction, on the very pair whose lengths a manifest's names depend on matching.
    const mode = resolveMode(category, current.output.directionalMode);

    return {
      names: componentSlots(category, mode, current.output.directions, current.output.sheetIndex, anatomy),
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
  }, [category, additionalAnatomy, output]);
}
