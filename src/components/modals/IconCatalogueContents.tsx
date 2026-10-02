import { useCallback, useMemo, useRef, useState } from 'react';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { ICON_CATALOGUE_GROUPS } from '../../constants/iconCatalogue/index.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useShowToast } from '../../hooks/useShowToast.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { ICON_KINDS } from '../../types/iconCatalogue.ts';
import type { IconCatalogueFilter } from '../../types/iconCatalogue.ts';
import type { CustomIconEntry, IconPick } from '../../types/iconRoster.ts';
import { customIconShelves } from '../../utils/customIconShelves.ts';
import { iconCatalogueSearch } from '../../utils/iconCatalogueSearch.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { CustomIconForm } from './CustomIconForm.tsx';
import { CustomIconShelfSection } from './CustomIconShelfSection.tsx';
import { IconCatalogueFilters } from './IconCatalogueFilters.tsx';
import { IconCatalogueFooter } from './IconCatalogueFooter.tsx';
import { IconCatalogueGroupSection } from './IconCatalogueGroupSection.tsx';

/** What the dialog shows on opening: the whole catalogue. */
const UNFILTERED: IconCatalogueFilter = { query: '', kind: 'ALL', school: 'ALL', tickedOnly: false };

/** Picks for a subject with no roster, which the dialog is never opened over but has to type. */
const NO_PICKS: readonly IconPick[] = [];

/** The form's subject while it is open: an entry of the reader's own to change, or `null` for a new one. */
interface Editing {
  readonly entry: CustomIconEntry | null;
}

/**
 * The icon catalogue: every shelf of icons a set can draw, ticked into the studio's roster, with the
 * reader's own icons on shelves of their own and the form that writes them.
 *
 * **Every tick lands in the studio at once**, through `useSubjectStore.toggleIcons`, as one step of the
 * studio's undo stack; there is nothing to submit, so the footer's Done only closes the dialog. An icon
 * of the reader's own is added, changed and removed the same way, one act each. The filters and the
 * open form are this dialog's own view state, and go when it closes.
 *
 * **The reader's own shelves follow the catalogue's last shelf of their kind**, which is where the roster
 * draws them (`sortIconPicks`), so the dialog's order is the sheets' order. The filters narrow them as
 * they narrow the catalogue's.
 *
 * **Each row's secondary line is the look the sheet will ask for**, resolved under the subject's
 * *World & Era* through `iconLookText` — the resolver the inventory line uses — so changing the world
 * and reopening the catalogue shows the new looks, and the row and the prompt never disagree.
 *
 * **Focus follows the form**: opening it focuses its first field, and closing it returns focus to the
 * button that opened it, or to *Add your own icon* where that button has gone. Escape inside the form
 * cancels the form alone (`CustomIconForm`); outside it, Escape closes the dialog as before.
 *
 * **A form whose entry leaves the roster closes**, by whatever route it left — *Clear all*, its own
 * Remove, an undo — because a change saved to an entry that is gone would land nowhere. The check
 * refuses such a save too (`checkCustomIcon`); this keeps the reader from typing into one at all. It is
 * settled during render, as a state adjustment rather than an effect, so no frame shows the stale form.
 *
 * **The contents alone — the dialog frame is `AppOverlays`'**, for the reason `LazyOverlay` gives.
 */
export function IconCatalogueContents() {
  const picks = useSubjectStore((state) => state.subject.icons?.picks ?? NO_PICKS);
  const world = useSubjectStore((state) => state.subject.setting);
  const removeCustomIcon = useSubjectStore((state) => state.removeCustomIcon);
  const showToast = useShowToast();
  const [filter, setFilter] = useState<IconCatalogueFilter>(UNFILTERED);
  const [editing, setEditing] = useState<Editing | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const editedId = editing?.entry?.id;
  if (
    editedId !== undefined &&
    !picks.some((pick) => pick.source === 'CUSTOM' && pick.entry.id === editedId)
  ) {
    setEditing(null);
  }

  const shown = useMemo(
    () => iconCatalogueSearch(ICON_CATALOGUE_GROUPS, filter, picks, world),
    [filter, picks, world],
  );
  const own = useMemo(() => customIconShelves(picks, filter, world), [filter, picks, world]);

  const openForm = useCallback((entry: CustomIconEntry | null) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing({ entry });
  }, []);
  const closeForm = useCallback(() => {
    setEditing(null);
    requestAnimationFrame(() => {
      (opener.current?.isConnected === true ? opener.current : addButton.current)?.focus();
    });
  }, []);
  const remove = useCallback(
    (entry: CustomIconEntry) => {
      removeCustomIcon(entry.id);
      showToast(CUSTOM_ICON_NOTICES.removed(entry.role));
      setEditing((current) => (current?.entry?.id === entry.id ? null : current));
      addButton.current?.focus();
    },
    [removeCustomIcon, showToast],
  );

  return (
    <>
      <IconCatalogueFilters filter={filter} world={world} onChange={setFilter} />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-60 text-xs leading-relaxed text-ink-muted">
            Where your game needs an icon the catalogue does not hold, write your own: it joins the set as a
            named slot like any ticked icon.
          </p>
          <ControlTooltip hint="Add your own icon" text={ICON_CATALOGUE_ACTION_TOOLTIPS.addOwn}>
            <Button
              ref={addButton}
              variant="view"
              size="md"
              aria-expanded={editing !== null}
              onClick={() => {
                openForm(null);
              }}
            >
              Add your own icon
            </Button>
          </ControlTooltip>
        </div>

        {editing !== null && (
          <CustomIconForm key={editing.entry?.id ?? 'new'} entry={editing.entry} onClose={closeForm} />
        )}

        {shown.length === 0 && own.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-6 text-center text-xs text-ink-faint">
            {filter.tickedOnly && picks.length === 0
              ? 'No icons are ticked yet. Clear the Ticked only filter to see the whole catalogue.'
              : 'No icon matches that search and those filters.'}
          </p>
        ) : (
          ICON_KINDS.flatMap((kind) => [
            ...shown
              .filter((group) => group.kind === kind)
              .map((group) => <IconCatalogueGroupSection key={group.id} group={group} />),
            ...own
              .filter((shelf) => shelf.kind === kind)
              .map((shelf) => (
                <CustomIconShelfSection
                  key={`own-${shelf.kind}`}
                  shelf={shelf}
                  world={world}
                  onEdit={openForm}
                  onRemove={remove}
                />
              )),
          ])
        )}
      </div>

      <IconCatalogueFooter />
    </>
  );
}
