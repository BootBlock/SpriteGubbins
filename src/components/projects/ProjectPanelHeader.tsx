import { useRef, useState } from 'react';
import { isDefaultProject } from '../../constants/projects.ts';
import { PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import type { Project } from '../../types/project.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { ProjectDetailsForm } from './ProjectDetailsForm.tsx';

interface ProjectPanelHeaderProps {
  readonly project: Project;
  /** How many saves this project holds, which is what the delete confirmation has to say aloud. */
  readonly savedCount: number;
}

/**
 * What a project is called, and the two things that can be done to the project itself.
 *
 * Split from the panel below it because the editor and the delete confirmation are **state**, and
 * the lists under them have none: held in the panel, an open confirmation would have to be reset
 * whenever the reader moved to another project, which is a thing to get wrong rather than a thing
 * to render.
 *
 * **Delete says how much goes with it.** The count is the whole warning — a project holding nothing
 * is a container and a project holding twelve saves is twelve pieces of work, and the two deserve
 * different amounts of hesitation from the reader. The Default project offers no delete at all and
 * says so in its place, because a control that cannot ever be used is worse than a sentence
 * explaining why there is none.
 */
export function ProjectPanelHeader({ project, savedCount }: ProjectPanelHeaderProps) {
  const deleteProject = useProjectStore((state) => state.deleteProject);

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // Focused *before* the state change: the edit button never unmounts, so it can take focus now and
  // still hold it once the editor goes. Otherwise focus would fall to the document.
  const closeEditor = () => {
    editButtonRef.current?.focus();
    setIsEditing(false);
  };

  return (
    <div className="space-y-3 border-b border-foundry-700 pb-4">
      {isEditing ? (
        <ProjectDetailsForm project={project} onClose={closeEditor} />
      ) : (
        <div className="space-y-1">
          <h3 className="text-base font-bold text-tab">{project.name}</h3>
          {project.description !== '' && <p className="text-sm text-ink-muted">{project.description}</p>}
        </div>
      )}

      {isConfirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-ink-muted">
            {savedCount === 0
              ? 'This project holds nothing. Deleting it removes the project alone.'
              : `Deleting this project also deletes the ${String(savedCount)} ${savedCount === 1 ? 'save' : 'saves'} filed in it.`}
          </p>
          <ControlTooltip
            hint={`Delete “${project.name}”`}
            text={PROJECT_ACTION_TOOLTIPS.confirmDeleteProject}
          >
            <button
              type="button"
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the panel moves on as soon as it does.
              onClick={() => {
                setIsConfirmingDelete(false);
                void deleteProject(project.id);
              }}
              className="rounded-lg bg-rose px-3 py-1 text-xs font-bold text-foundry-950 transition-opacity hover:opacity-90"
            >
              Delete “{project.name}”
            </button>
          </ControlTooltip>
          <ControlTooltip hint="Cancel" text={PROJECT_ACTION_TOOLTIPS.cancelDeleteProject}>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(false);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
            >
              Cancel
            </button>
          </ControlTooltip>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <ControlTooltip hint="Edit details" text={PROJECT_ACTION_TOOLTIPS.editProjectDetails}>
            <button
              ref={editButtonRef}
              type="button"
              aria-label={`Edit the name and description of the project ${project.name}`}
              onClick={() => {
                setIsEditing(true);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 hover:text-ink"
            >
              Edit
            </button>
          </ControlTooltip>

          {isDefaultProject(project.id) ? (
            <p className="text-xs text-ink-faint">
              The Default project cannot be deleted — it is where a save goes when you have chosen nothing
              else. You can still rename it.
            </p>
          ) : (
            <ControlTooltip hint="Delete project" text={PROJECT_ACTION_TOOLTIPS.deleteProject}>
              <button
                type="button"
                aria-label={`Delete the project ${project.name}`}
                onClick={() => {
                  // The editor would otherwise sit above a confirm asking to delete what it edits.
                  setIsEditing(false);
                  setIsConfirmingDelete(true);
                }}
                className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-rose transition-colors hover:border-rose/50 hover:bg-foundry-700"
              >
                Delete project
              </button>
            </ControlTooltip>
          )}
        </div>
      )}
    </div>
  );
}
