import type { RefObject } from 'react';
import { ICON_PICKER_TOOLTIPS } from '../../constants/iconCatalogue/iconPickerTooltips.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useCustomIconLibraryStore } from '../../stores/useCustomIconLibraryStore.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { ProjectSelectField } from '../projects/ProjectSelectField.tsx';

interface CustomIconLibraryBarProps {
  /** The project whose library the shelves show, as `useIconLibrary` resolved it. */
  readonly projectId: string;
  /** Whether the form is open, which the Add button reports as its expanded state. */
  readonly isFormOpen: boolean;
  /** The Add button, which focus returns to where the control that opened the form has gone. */
  readonly addButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onAdd: () => void;
}

/**
 * The head of the reader's own icons in the catalogue dialog: what they are, which project's library
 * the shelves show, and the button that opens the form for a new one.
 *
 * The project is chosen with the app's one project control (`ProjectSelectField`), so its list and its
 * fallback to the first project are the save panels' own; the choice is the library store's and lasts
 * while the tab is open.
 */
export function CustomIconLibraryBar({
  projectId,
  isFormOpen,
  addButtonRef,
  onAdd,
}: CustomIconLibraryBarProps) {
  const chooseProject = useCustomIconLibraryStore((state) => state.chooseProject);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <p className="min-w-0 flex-1 basis-60 text-xs leading-relaxed text-ink-muted">
        Where your game needs an icon the catalogue does not hold, write your own: it joins the set as a named
        slot like any ticked icon, and the project’s library keeps it for your later sets.
      </p>
      <div className="w-full sm:w-56">
        <ProjectSelectField
          label="Library"
          tooltip={ICON_PICKER_TOOLTIPS.libraryProject}
          value={projectId}
          onChange={chooseProject}
        />
      </div>
      <ControlTooltip hint="Add your own icon" text={ICON_CATALOGUE_ACTION_TOOLTIPS.addOwn}>
        <Button ref={addButtonRef} variant="view" size="md" aria-expanded={isFormOpen} onClick={onAdd}>
          Add your own icon
        </Button>
      </ControlTooltip>
    </div>
  );
}
