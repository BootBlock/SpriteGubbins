import { useRef, useState } from 'react';
import { PRESET_ACTION_TOOLTIPS, PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import type { CustomArchetype } from '../../types/preset.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { PresetCardSpecs } from '../tabs/PresetCardSpecs.tsx';
import { PresetDetailsForm } from './PresetDetailsForm.tsx';
import { ProjectSelectField } from './ProjectSelectField.tsx';

interface ProjectPresetRowProps {
  readonly preset: CustomArchetype;
}

/**
 * One studio archetype the reader saved, inside the project it is filed under.
 *
 * **A row rather than a card, and the project dropdown is why.** The preset library shows its
 * built-ins as a grid of cards, which is right for browsing seventy of them — but a card in a
 * three-column grid is about 240px wide, and a native `<select>` truncates an option it cannot fit.
 * Every project name in the app would have lost its tail in the one control that re-files a preset.
 * A full-width row gives that control the width the app's own option budget asks for, and this view
 * is for organising rather than browsing in any case.
 *
 * It reads the store for all four of its actions rather than taking them as props. The panel above
 * it holds no state of its own that way, and the row is the level that knows which preset each
 * action is about.
 *
 * **Delete confirms in place**, which is the arrangement the quantiser's saved rows already use:
 * the record is the user's, nothing else holds a copy, and there is no undo. The confirmation
 * replaces the row's buttons rather than opening a dialog, so the name being deleted stays on
 * screen beside it.
 */
export function ProjectPresetRow({ preset }: ProjectPresetRowProps) {
  const loadPreset = usePresetStore((state) => state.loadPreset);
  const deleteCustomPreset = usePresetStore((state) => state.deleteCustomPreset);
  const moveCustomPreset = usePresetStore((state) => state.moveCustomPreset);

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // Focused *before* the state change, not after: the edit button never unmounts, so it can take
  // focus now and still hold it once the editor goes. Otherwise focus would fall to the document.
  const closeEditor = () => {
    editButtonRef.current?.focus();
    setIsEditing(false);
  };

  return (
    <li className="animate-pop-in space-y-3 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {isEditing ? (
            <PresetDetailsForm preset={preset} onClose={closeEditor} />
          ) : (
            <h4 className="truncate text-sm font-bold text-ink">{preset.name}</h4>
          )}
          {/*
            The description where there is one, and the subject where there is not — the library
            card's rule, for the same reason: a preset that describes itself has already said the
            useful half of “Human — Dark Fantasy”, and a preset saved with the box empty is better
            served by naming its species and setting than by a gap.
          */}
          <p className="text-xs text-ink-muted">
            {preset.description === ''
              ? `${preset.subject.species} — ${preset.subject.setting}`
              : preset.description}
          </p>
        </div>
        <Badge tone="view">{preset.category}</Badge>
      </div>

      <PresetCardSpecs category={preset.category} output={preset.output} />

      <ProjectSelectField
        label="Project"
        tooltip={PROJECT_ACTION_TOOLTIPS.movePresetProject}
        value={preset.projectId}
        onChange={(projectId) => {
          void moveCustomPreset(preset.id, projectId);
        }}
      />

      {isConfirmingDelete ? (
        <div className="flex flex-wrap gap-2">
          <ControlTooltip hint={`Delete “${preset.name}”`} text={PRESET_ACTION_TOOLTIPS.confirmDeletePreset}>
            <button
              type="button"
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the row leaves as soon as it does.
              onClick={() => {
                setIsConfirmingDelete(false);
                void deleteCustomPreset(preset.id);
              }}
              className="rounded-lg bg-rose px-3 py-1 text-xs font-bold text-foundry-950 transition-opacity hover:opacity-90"
            >
              Delete “{preset.name}”
            </button>
          </ControlTooltip>
          <ControlTooltip hint="Cancel" text={PRESET_ACTION_TOOLTIPS.cancelDeletePreset}>
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
        <div className="flex flex-wrap gap-2">
          <ControlTooltip hint="Load preset" text={PRESET_ACTION_TOOLTIPS.loadPreset}>
            <button
              type="button"
              aria-label={`Load the preset ${preset.name} into the studio`}
              onClick={() => {
                loadPreset(preset);
              }}
              className="action-tab rounded-lg px-3 py-1 text-xs font-semibold transition-all active:scale-[0.98]"
            >
              Load preset
            </button>
          </ControlTooltip>

          <ControlTooltip hint="Edit details" text={PRESET_ACTION_TOOLTIPS.editPresetDetails}>
            <button
              ref={editButtonRef}
              type="button"
              aria-label={`Edit details for preset ${preset.name}`}
              onClick={() => {
                setIsEditing(true);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 hover:text-ink"
            >
              Edit
            </button>
          </ControlTooltip>

          <ControlTooltip hint="Delete" text={PRESET_ACTION_TOOLTIPS.deletePreset}>
            <button
              type="button"
              aria-label={`Delete preset ${preset.name}`}
              onClick={() => {
                // The editor would otherwise sit above a confirm asking to delete what it edits.
                setIsEditing(false);
                setIsConfirmingDelete(true);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-rose transition-colors hover:border-rose/50 hover:bg-foundry-700"
            >
              Delete
            </button>
          </ControlTooltip>
        </div>
      )}
    </li>
  );
}
