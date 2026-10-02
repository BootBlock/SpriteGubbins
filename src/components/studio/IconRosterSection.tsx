import { ICON_ROSTER_SECTION } from '../../constants/iconRosterSection.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useIconRosterSummary } from '../../hooks/useIconRosterSummary.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Button } from '../common/Button.tsx';
import { CollapsibleSection } from '../common/CollapsibleSection.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * The Subject Definition panel's icon roster: what the set draws, in figures, and the way into the
 * catalogue that changes it.
 *
 * **A summary rather than the list.** The roster can run to hundreds of icons, and the catalogue dialog
 * is where they are read and ticked; here the reader needs what the set amounts to — icons, components
 * against the capacity, sheets — which is also what decides how many generations it takes.
 *
 * Rendered only for a subject carrying a roster, which is a subject of a category that declares one.
 * There is no look control yet: one look exists, and a choice of one is not a choice (phase 3 of
 * `docs/todo/icon-catalogue.md` adds the control with its second value).
 */
export function IconRosterSection() {
  const reading = useIconRosterSummary();
  const toggleIconCatalogueModal = useUIStore((state) => state.toggleIconCatalogueModal);

  if (reading === null) return null;

  return (
    <CollapsibleSection {...ICON_ROSTER_SECTION} digest={reading.summary.digest}>
      <p className="text-xs leading-relaxed text-ink-muted">{reading.summary.sentence}</p>
      <p className="text-xs leading-relaxed text-ink-muted">{reading.summary.kinds}</p>
      <ControlTooltip hint="Open the icon catalogue" text={ICON_CATALOGUE_ACTION_TOOLTIPS.openCatalogue}>
        <Button variant="view" size="md" onClick={toggleIconCatalogueModal}>
          <span aria-hidden="true">🗂️</span> Open the icon catalogue
        </Button>
      </ControlTooltip>
    </CollapsibleSection>
  );
}
