import { useCallback, useId } from 'react';
import { DEFAULT_ICON_COLOUR_MODE } from '../../constants/iconCatalogue/defaultIconColourMode.ts';
import { ICON_CAPACITY_NOTICES } from '../../constants/iconCatalogue/iconCapacityNotices.ts';
import { iconComponentCount } from '../../constants/iconCatalogue/index.ts';
import { ICON_ROSTER_CAPACITY } from '../../constants/iconCatalogue/iconSheetLimits.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useShowToast } from '../../hooks/useShowToast.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';
import type { IconPick } from '../../types/iconRoster.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { iconRosterTally } from '../../utils/iconRosterTally.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { IconCatalogueRow } from './IconCatalogueRow.tsx';

/** Picks for a subject with no roster, which the dialog is never opened over but has to type. */
const NO_PICKS: readonly IconPick[] = [];

interface IconCatalogueGroupSectionProps {
  /** The shelf as the dialog's filters leave it: only the entries they show. */
  readonly group: IconCatalogueGroup;
}

/**
 * One shelf of the catalogue: its heading, a tick and an untick for what it shows, and a row per icon.
 *
 * **The group buttons act on the rows shown**, not on the whole shelf, so a search narrows what Tick
 * all ticks; their cards say so. A tick the set has no room for is refused by the store and reported
 * here through the notification, and a row that cannot fit says why under its label, so no refusal is
 * silent.
 */
export function IconCatalogueGroupSection({ group }: IconCatalogueGroupSectionProps) {
  const picks = useSubjectStore((state) => state.subject.icons?.picks ?? NO_PICKS);
  const world = useSubjectStore((state) => state.subject.setting);
  const colourMode = useSubjectStore((state) => state.subject.icons?.colourMode ?? DEFAULT_ICON_COLOUR_MODE);
  const toggleIcons = useSubjectStore((state) => state.toggleIcons);
  const showToast = useShowToast();
  const headingId = useId();

  const ticked = new Set(picks.map(iconPickId));
  const left = ICON_ROSTER_CAPACITY - iconRosterTally(picks).components;
  const ids = group.entries.map((entry) => entry.id);
  const tickedHere = ids.filter((id) => ticked.has(id)).length;

  const tick = useCallback(
    (on: boolean, which: readonly string[]) => {
      const refused = toggleIcons(which, on);
      if (refused.length > 0) showToast(ICON_CAPACITY_NOTICES.refused(refused.length));
    },
    [toggleIcons, showToast],
  );
  const toggleOne = useCallback(
    (id: string, on: boolean) => {
      tick(on, [id]);
    },
    [tick],
  );

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-foundry-700 pb-2">
        <h3 id={headingId} className="flex-1 text-xs font-bold tracking-wide text-ink uppercase">
          {group.label}{' '}
          <span className="font-mono font-normal tracking-normal text-ink-faint normal-case">
            {tickedHere} of {ids.length} ticked
          </span>
        </h3>
        <ControlTooltip hint={`Tick all ${group.label}`} text={ICON_CATALOGUE_ACTION_TOOLTIPS.tickGroup}>
          <Button
            variant="secondary"
            size="sm"
            disabled={tickedHere === ids.length}
            aria-label={`Tick all ${group.label}`}
            onClick={() => {
              tick(true, ids);
            }}
          >
            Tick all
          </Button>
        </ControlTooltip>
        <ControlTooltip hint={`Untick all ${group.label}`} text={ICON_CATALOGUE_ACTION_TOOLTIPS.untickGroup}>
          <Button
            variant="secondary"
            size="sm"
            disabled={tickedHere === 0}
            aria-label={`Untick all ${group.label}`}
            onClick={() => {
              tick(false, ids);
            }}
          >
            Untick all
          </Button>
        </ControlTooltip>
      </div>

      <ul className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {group.entries.map((entry) => {
          const isTicked = ticked.has(entry.id);
          const needed = iconComponentCount(entry);
          return (
            <IconCatalogueRow
              key={entry.id}
              entry={entry}
              world={world}
              colourMode={colourMode}
              checked={isTicked}
              disabledReason={!isTicked && needed > left ? ICON_CAPACITY_NOTICES.row(needed, left) : ''}
              onToggle={toggleOne}
            />
          );
        })}
      </ul>
    </section>
  );
}
