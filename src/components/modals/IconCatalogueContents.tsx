import { useMemo, useState } from 'react';
import { ICON_CATALOGUE_GROUPS } from '../../constants/iconCatalogue/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { IconCatalogueFilter } from '../../types/iconCatalogue.ts';
import { iconCatalogueSearch } from '../../utils/iconCatalogueSearch.ts';
import { IconCatalogueFilters } from './IconCatalogueFilters.tsx';
import { IconCatalogueFooter } from './IconCatalogueFooter.tsx';
import { IconCatalogueGroupSection } from './IconCatalogueGroupSection.tsx';

/** What the dialog shows on opening: the whole catalogue. */
const UNFILTERED: IconCatalogueFilter = { query: '', kind: 'ALL', tickedOnly: false };

/** Picks for a subject with no roster, which the dialog is never opened over but has to type. */
const NO_PICKS: readonly string[] = [];

/**
 * The icon catalogue: every shelf of icons a set can draw, ticked into the studio's roster.
 *
 * **Every tick lands in the studio at once**, through `useSubjectStore.toggleIcons`, as one step of the
 * studio's undo stack; there is nothing to submit, so the footer's Done only closes the dialog. The
 * filters are this dialog's own view state, and go when it closes.
 *
 * **Each row's secondary line is the look the sheet will ask for**, resolved under the subject's
 * *World & Era* through `iconLookText` — the resolver the inventory line uses — so changing the world
 * and reopening the catalogue shows the new looks, and the row and the prompt never disagree.
 *
 * **The contents alone — the dialog frame is `AppOverlays`'**, for the reason `LazyOverlay` gives.
 */
export function IconCatalogueContents() {
  const picks = useSubjectStore((state) => state.subject.icons?.picks ?? NO_PICKS);
  const world = useSubjectStore((state) => state.subject.setting);
  const [filter, setFilter] = useState<IconCatalogueFilter>(UNFILTERED);

  const shown = useMemo(
    () => iconCatalogueSearch(ICON_CATALOGUE_GROUPS, filter, picks, world),
    [filter, picks, world],
  );

  return (
    <>
      <IconCatalogueFilters filter={filter} onChange={setFilter} />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        {shown.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-6 text-center text-xs text-ink-faint">
            {filter.tickedOnly && picks.length === 0
              ? 'No icons are ticked yet. Clear the Ticked only filter to see the whole catalogue.'
              : 'No icon matches that search and those filters.'}
          </p>
        ) : (
          shown.map((group) => <IconCatalogueGroupSection key={group.id} group={group} />)
        )}
      </div>

      <IconCatalogueFooter />
    </>
  );
}
