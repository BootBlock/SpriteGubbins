import { useCallback, useState } from 'react';
import { PROJECT_NAME_MAX_LENGTH } from '../../constants/projects.ts';
import { PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import type { Project } from '../../types/project.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface ProjectDetailsFormProps {
  readonly project: Project;
  /** Close without saving. The panel uses this to put focus back where it came from. */
  readonly onClose: () => void;
}

/**
 * Editing one project's name and the sentence under it, in place of its heading.
 *
 * Its own file because it is a small state machine rather than a control: two drafts, an in-flight
 * write, a submit that may be refused, and focus to place — none of which the panel around it needs
 * to know about.
 *
 * **Nothing filed in the project moves**, and that is the point of a project being addressed by an
 * id: a preset refers to the container, not to what it is called, so a rename is a change to a
 * label and to nothing else.
 *
 * A real `<form>`, so Enter submits without a keydown handler re-implementing what the platform
 * already does.
 */
export function ProjectDetailsForm({ project, onClose }: ProjectDetailsFormProps) {
  const updateProjectDetails = useProjectStore((state) => state.updateProjectDetails);

  const [draftName, setDraftName] = useState(project.name);
  const [draftDescription, setDraftDescription] = useState(project.description);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Moves focus into the name field as it appears. It has to move: the keyboard was on the button
   * that opened this, and that button is still there but is no longer where the work is.
   *
   * A *stable* callback ref, so React runs it on mount and unmount only — an inline arrow changes
   * identity every render and would drag focus back on every keystroke.
   */
  const focusOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        try {
          // Closed only when it was actually stored. The store refuses a name another project holds
          // and says so; closing anyway would hide that nothing happened.
          if (await updateProjectDetails(project.id, draftName, draftDescription)) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
    >
      {/*
        The ⓘ rather than a card on each box, for the reason every other value field in the app takes
        one — and here the reason is sharper than consistency. The first field is focused the instant
        it appears, so guidance revealed by focus would open unasked over the panel below every time
        this editor is opened.
      */}
      <div className="flex items-center gap-2">
        <Tooltip text={PROJECT_ACTION_TOOLTIPS.projectNameBox} hint="New name" />
        <input
          ref={focusOnMount}
          type="text"
          value={draftName}
          maxLength={PROJECT_NAME_MAX_LENGTH}
          aria-label={`New name for the project ${project.name}`}
          onChange={(event) => {
            setDraftName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          className="w-full min-w-0 rounded-lg border border-foundry-600 bg-foundry-950 px-2 py-1 text-sm font-bold text-ink transition-colors focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-2">
        <Tooltip text={PROJECT_ACTION_TOOLTIPS.projectDescriptionBox} hint="Description" />
        <input
          type="text"
          value={draftDescription}
          placeholder="What this project covers"
          aria-label={`Description for the project ${project.name}`}
          onChange={(event) => {
            setDraftDescription(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          className="w-full min-w-0 rounded-lg border border-foundry-600 bg-foundry-950 px-2 py-1 text-xs text-ink transition-colors focus:border-accent"
        />
      </div>

      <div className="flex justify-end gap-2">
        <ControlTooltip hint="Save" text={PROJECT_ACTION_TOOLTIPS.confirmProjectDetails}>
          <button
            type="submit"
            disabled={isSaving || draftName.trim() === ''}
            className="action-tab rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </ControlTooltip>
        <ControlTooltip hint="Cancel" text={PROJECT_ACTION_TOOLTIPS.cancelProjectDetails}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-foundry-600 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            Cancel
          </button>
        </ControlTooltip>
      </div>
    </form>
  );
}
