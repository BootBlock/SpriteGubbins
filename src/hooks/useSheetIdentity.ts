import { useMemo } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { sheetIdentity } from '../utils/sheetIdentity.ts';
import type { SheetIdentity } from '../utils/sheetIdentity.ts';

/**
 * What the studio says the sheet on the Quantise tab is — read from the stores, in one place.
 *
 * **Two call sites on that tab, and they must not be able to disagree.** The download writes this
 * into a manifest, names the file after it and lays a sprite pack out by it, while the identity
 * panel puts it on screen, and the whole point of the panel is that
 * the reader can see the figure *before* pressing the button that records it. Two components each
 * doing their own store reads and their own memo would agree in every state the app can reach — the
 * derivation is pure — but the agreement would be a coincidence of two copies rather than one
 * reading, on exactly the pair the issue behind the panel was about.
 *
 * A hook rather than a prop drilled down from the tab: `DownloadControls` sits three panels below
 * `QuantiseTab`, behind `ImageComparison` and `ComparisonToolbar`, neither of which has anything to
 * do with the studio's configuration. The derivation itself stays pure in `utils/sheetIdentity.ts`;
 * what needs React is only the two store reads and the memo.
 */
export function useSheetIdentity(): SheetIdentity {
  const category = useSubjectStore((state) => state.category);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const output = useOutputStore((state) => state.output);

  return useMemo(
    () => sheetIdentity(category, output, additionalAnatomy),
    [category, output, additionalAnatomy],
  );
}
