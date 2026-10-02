import { DIALOG_TOOLTIPS, ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useIconRosterSummary } from '../../hooks/useIconRosterSummary.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * What the set amounts to as the reader ticks, and the two actions on it as a whole: clear it, or close
 * the dialog.
 *
 * **The summary is a polite live region**, so a reader ticking by keyboard hears the icon, component
 * and sheet counts move with each tick — the one consequence of a tick that the row itself cannot show.
 * It reads the same hook as the studio section, so the two never disagree about how many sheets a set
 * is.
 */
export function IconCatalogueFooter() {
  const reading = useIconRosterSummary();
  const clearIcons = useSubjectStore((state) => state.clearIcons);
  const toggleIconCatalogueModal = useUIStore((state) => state.toggleIconCatalogueModal);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foundry-700 px-6 py-4">
      <div className="min-w-0 flex-1 basis-72 space-y-1">
        <p role="status" className="text-xs leading-relaxed text-ink">
          {reading?.summary.sentence}
        </p>
        <p className="text-2xs leading-relaxed text-ink-muted">{reading?.summary.kinds}</p>
      </div>

      <div className="flex items-center gap-2">
        <ControlTooltip hint="Clear all" text={ICON_CATALOGUE_ACTION_TOOLTIPS.clearAll}>
          <Button
            variant="danger"
            size="lg"
            disabled={(reading?.tally.icons ?? 0) === 0}
            onClick={clearIcons}
          >
            Clear all
          </Button>
        </ControlTooltip>
        <ControlTooltip hint="Done" text={DIALOG_TOOLTIPS.done}>
          <Button variant="primary" size="lg" onClick={toggleIconCatalogueModal}>
            Done
          </Button>
        </ControlTooltip>
      </div>
    </div>
  );
}
