import { ICON_COLOUR_MODE_LABELS } from '../../constants/iconCatalogue/iconColourModeLabels.ts';
import { ICON_COLOUR_MODE_TOOLTIPS } from '../../constants/iconCatalogue/iconColourModeTooltips.ts';
import { ICON_LOOK_LABELS } from '../../constants/iconCatalogue/iconLookLabels.ts';
import { ICON_LOOK_TOOLTIPS } from '../../constants/iconCatalogue/iconLookTooltips.ts';
import { ICON_ROSTER_SECTION } from '../../constants/iconRosterSection.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useIconRosterSummary } from '../../hooks/useIconRosterSummary.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { ICON_COLOUR_MODES, ICON_LOOKS } from '../../types/iconRoster.ts';
import { Button } from '../common/Button.tsx';
import { CollapsibleSection } from '../common/CollapsibleSection.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

/**
 * The Subject Definition panel's icon roster: the look the set is drawn in, what the set draws, in
 * figures, and the way into the catalogue that changes it.
 *
 * **A summary rather than the list.** The roster can run to hundreds of icons, and the catalogue dialog
 * is where they are read and ticked; here the reader needs what the set amounts to — icons, components
 * against the capacity, sheets — which is also what decides how many generations it takes.
 *
 * **The look comes first**, because it is the one choice here that rewrites every sheet of the set at
 * once — the icon sheets, the overlay sheet and the files cut from them — where a tick moves one icon.
 * It is a row of pills (`SegmentedChoice`) under a label carrying the card, as the Quantise tab's small
 * choices are, and each press is one act on the studio's undo stack (`setIconLook`).
 *
 * **The colour mode follows it**, the other choice that rewrites a whole set at once: every icon sheet
 * turns to a tint mask the engine colours by team, or back (audit finding M1). It is a second row of
 * pills under a label of its own, and each press is one act too (`setIconColourMode`).
 *
 * Rendered only for a subject carrying a roster, which is a subject of a category that declares one.
 */
export function IconRosterSection() {
  const reading = useIconRosterSummary();
  const look = useSubjectStore((state) => state.subject.icons?.look);
  const setIconLook = useSubjectStore((state) => state.setIconLook);
  const colourMode = useSubjectStore((state) => state.subject.icons?.colourMode);
  const setIconColourMode = useSubjectStore((state) => state.setIconColourMode);
  const toggleIconCatalogueModal = useUIStore((state) => state.toggleIconCatalogueModal);

  if (reading === null || look === undefined || colourMode === undefined) return null;

  return (
    <CollapsibleSection {...ICON_ROSTER_SECTION} digest={reading.summary.digest}>
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Look</span>
          <Tooltip text={ICON_LOOK_TOOLTIPS.look} hint="Look" />
        </div>
        <SegmentedChoice
          label="Look"
          values={ICON_LOOKS}
          value={look}
          format={(option) => ICON_LOOK_LABELS[option]}
          onChange={setIconLook}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Colour</span>
          <Tooltip text={ICON_COLOUR_MODE_TOOLTIPS.colourMode} hint="Colour" />
        </div>
        <SegmentedChoice
          label="Colour"
          values={ICON_COLOUR_MODES}
          value={colourMode}
          format={(option) => ICON_COLOUR_MODE_LABELS[option]}
          onChange={setIconColourMode}
        />
      </div>
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
