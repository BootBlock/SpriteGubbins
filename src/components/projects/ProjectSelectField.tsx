import { useMemo } from 'react';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { SelectField } from '../common/SelectField.tsx';

interface ProjectSelectFieldProps {
  /** What the control is choosing here — "Save into" where a save is being filed, "Project" where one is being moved. */
  readonly label: string;
  readonly tooltip: string;
  /** The project currently chosen. A value no project holds falls back to the first in the list. */
  readonly value: string;
  readonly onChange: (projectId: string) => void;
}

/**
 * The one control that chooses a project, wherever a project has to be chosen.
 *
 * Four call sites — the two save panels and the two move controls on a saved card or row — and one
 * component, because the options are the same list every time and a second implementation is where
 * one of them would quietly stop offering a project the reader had just made. It reads the store
 * itself rather than being handed the list, for the reason every panel in this app reads its own
 * store: the alternative is threading the projects through the studio and the quantiser to reach a
 * dropdown neither of them has an opinion about.
 *
 * **The fallback is derived rather than corrected.** A caller holds the chosen id in its own state,
 * and that id can stop naming a project — the project was deleted, or a library import replaced the
 * lot — so the value handed to the control is the caller's choice where it still exists and the
 * first project otherwise. Deriving it during render is what keeps that out of an effect, which
 * would paint one frame against a project that is not there and then correct itself.
 *
 * The wrapper is `max-w-md` and written as a literal class, which is what the quantiser's column
 * derivation reads: this select lands in that tab's control column, and 448px against the 442px a
 * budgeted option needs is the tightest constraint in the tab.
 */
export function ProjectSelectField({ label, tooltip, value, onChange }: ProjectSelectFieldProps) {
  const projects = useProjectStore((state) => state.projects);

  const projectChoices = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects],
  );

  const chosen = projects.some((project) => project.id === value) ? value : (projects[0]?.id ?? '');

  return (
    <div className="max-w-md">
      <SelectField
        label={label}
        tooltip={tooltip}
        value={chosen}
        choices={projectChoices}
        onChange={onChange}
      />
    </div>
  );
}
