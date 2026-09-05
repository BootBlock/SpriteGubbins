import { useState } from 'react';
import { QUANTISE_PRESET_GUIDANCE } from '../../constants/quantisePresets.ts';
import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { PROJECT_ACTION_TOOLTIPS, QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { findByName } from '../../utils/findByName.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TextField } from '../common/TextField.tsx';
import { ProjectSelectField } from '../projects/ProjectSelectField.tsx';
import { QuantisePresetList } from './QuantisePresetList.tsx';

/**
 * Saving the tab's dials under a name, and the collection of names already saved.
 *
 * **The one panel here that is not about the sheet on screen.** Every other control on this tab
 * describes *this* raster — its scale, its key colour, the palette taken off its result — and this
 * describes the reader's own way of working: the positions they arrived at after ten minutes of
 * moving sliders, kept so the next sheet does not start from the defaults again. That is why it
 * sits with the dials rather than on the Projects view, which is where a saved set is filed and
 * organised rather than made — see `QuantisePreset`.
 *
 * It reads the store rather than taking the dials as props, deliberately. The tab's transform runs
 * on a debounce, so a panel handed the positions as props would be one render behind the sliders
 * whenever a save landed mid-flight, and would store a setting the reader had already moved past.
 * `saveQuantisePreset` reads `useQuantiseStore` at the moment of the press instead.
 *
 * **The list below shows every saved set, whatever project each belongs to.** A project is where a
 * set is *filed*, not a filter on what this tab can reach — somebody who tuned a sheet for one game
 * and wants the same reading on another's should not have to switch project first. Each row says
 * which project it is in and can be re-filed from there.
 *
 * The panel used to carry an export and an import as well. Both moved to the Projects view, because
 * a pack now carries the projects and both saved collections together: a file of dial positions
 * without the projects they are filed under describes a library that cannot be assembled.
 */
export function QuantisePresetControls() {
  const presets = useQuantisePresetStore((state) => state.presets);
  const saveQuantisePreset = useQuantisePresetStore((state) => state.saveQuantisePreset);
  const projects = useProjectStore((state) => state.projects);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  /**
   * The project chosen for this save, or empty until one is.
   *
   * This panel's own draft, like the two boxes beside it. What it resolves to is derived below:
   * `ProjectSelectField` falls back to the first project where this names none, and the same
   * fallback is applied here so the control and the save agree about where a set is going.
   */
  const [projectId, setProjectId] = useState('');
  // The store's save is asynchronous and the button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same settings twice.
  const [isSaving, setIsSaving] = useState(false);

  const target = projects.some((project) => project.id === projectId) ? projectId : (projects[0]?.id ?? '');

  // Derived during render, by the rule the store saves by — which is scoped to the project, since a
  // name is unique inside one and not across the collection. So the button cannot promise one thing
  // and the store do another, and saying "Update" before the press makes a confirmation unnecessary.
  const overwrites = findByName(
    presets.filter((preset) => preset.projectId === target),
    name,
  );

  const save = async () => {
    setIsSaving(true);
    try {
      // Cleared only when it was actually stored: the store reports a failed write with a toast and
      // resolves normally, so emptying the boxes unconditionally would make the reader retype the
      // name to retry. The project is deliberately left alone — somebody saving two sets in a row
      // is saving them into the same project.
      if (await saveQuantisePreset(name, description, target)) {
        setName('');
        setDescription('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Saved settings</p>
        {presets.length === 0 ? (
          <Badge tone="attention">Nothing saved yet</Badge>
        ) : (
          <Badge tone="valid">
            {presets.length} {presets.length === 1 ? 'set' : 'sets'} saved
          </Badge>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <TextField
            label="Save these settings as"
            tooltip={QUANTISE_TOOLTIPS.presetName}
            value={name}
            placeholder="A name for this set"
            onChange={setName}
          />
        </div>

        <div className="min-w-48 flex-1">
          <TextField
            label="Describe it (optional)"
            tooltip={QUANTISE_TOOLTIPS.presetDescription}
            value={description}
            placeholder="What it is for"
            onChange={setDescription}
          />
        </div>

        <div className="min-w-48 flex-1">
          <ProjectSelectField
            label="Save into"
            tooltip={PROJECT_ACTION_TOOLTIPS.saveQuantiseProject}
            value={target}
            onChange={setProjectId}
          />
        </div>

        <ControlTooltip
          hint={overwrites ? 'Update' : 'Save'}
          text={QUANTISE_ACTION_TOOLTIPS.saveQuantisePreset}
        >
          <button
            type="button"
            disabled={isSaving || name.trim() === '' || target === ''}
            onClick={() => {
              void save();
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : overwrites ? 'Update' : 'Save'}
          </button>
        </ControlTooltip>
      </div>

      {presets.length > 0 && <QuantisePresetList presets={presets} />}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {presets.length === 0 ? QUANTISE_PRESET_GUIDANCE.empty : QUANTISE_PRESET_GUIDANCE.saved}
      </p>
    </section>
  );
}
