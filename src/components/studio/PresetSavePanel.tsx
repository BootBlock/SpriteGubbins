import { useId, useState } from 'react';
import { PRESET_ACTION_TOOLTIPS, PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { findByName } from '../../utils/findByName.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
import { ProjectSelectField } from '../projects/ProjectSelectField.tsx';

/**
 * Putting the studio's current configuration into a project.
 *
 * **It sits in the Studio rather than on the Presets tab**, which is where it used to be. What is
 * being saved is the configuration on screen, and asking somebody to navigate away from it in order
 * to name it was always the wrong way round — it became untenable once a save also had to choose a
 * project, since that is a third decision to make about a studio you can no longer see.
 *
 * The project comes from a dropdown of the projects the reader has made, and there is no way to
 * type a new one here: projects are made on the Projects view, which is what keeps the list a set
 * somebody curated rather than an accumulation of typos.
 */
export function PresetSavePanel() {
  const customPresets = usePresetStore((state) => state.customPresets);
  const saveCustomPreset = usePresetStore((state) => state.saveCustomPreset);
  const projects = useProjectStore((state) => state.projects);

  const [presetName, setPresetName] = useState('');
  /**
   * The description exactly as it will be saved — **the box always holds what Save is about to
   * write**, and that invariant is the whole design.
   *
   * Saving writes what is here, so a box that sat empty while the name grew into one the project
   * already holds would wipe that preset's sentence with nothing on screen to say so. The answer is
   * to adopt that preset's own description the moment the name starts naming it, in the name box's
   * own handler: the reader then edits or clears a sentence they can see, and a blank box means one
   * thing rather than two.
   *
   * The rejected alternative was a `string | null` draft displayed as `draft ?? target.description`,
   * where `null` meant "still following". It reads well and is wrong: `??` falls through on `null`
   * and not on `''`, so a reader who typed into the box and then *cleared* it left `''` behind, the
   * box stopped following, and the next Update blanked the stored description silently — the exact
   * failure the arrangement existed to prevent.
   */
  const [description, setDescription] = useState('');
  /**
   * Which preset the box last adopted from, so it adopts once per target rather than once per
   * keystroke.
   *
   * Without it, every edit to the name that lands back on the same preset — fixing a typo, adding
   * and removing a trailing space — would re-adopt and throw away whatever the reader had since
   * written in the description box.
   */
  const [followedId, setFollowedId] = useState<string | null>(null);
  /**
   * The project chosen for this save, or empty until one is.
   *
   * Held here rather than read back off the store, because it is this panel's own draft — the same
   * status the two text boxes have. What it resolves to is derived: `ProjectSelectField` falls back
   * to the first project where this names none, and the same fallback is applied below so the
   * control and the save agree about where a preset is going.
   */
  const [projectId, setProjectId] = useState('');
  // The store's save is asynchronous and its button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same configuration twice.
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();
  const descriptionId = useId();

  const target = projects.some((project) => project.id === projectId) ? projectId : (projects[0]?.id ?? '');

  // Derived during render, by the rule the store saves by — including the project, since a name is
  // unique inside one project and not across the library. So the button cannot promise one thing
  // and the store do another, and saying "Update" before the press is what makes a confirm
  // unnecessary.
  const overwrites = findByName(
    customPresets.filter((preset) => preset.projectId === target),
    presetName,
  );

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-5 shadow-xl">
      <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Save this configuration</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Keeps the studio exactly as it stands — the category, every subject field and every output setting —
        under a name, filed in one of your projects. Load it again from the Projects tab.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          {/* The ⓘ, not a card on the field itself: this is a labelled box holding a value, which is
              what that affordance has always marked, and a card revealed by focusing a field sits
              over the panel below for as long as the caret is in it. */}
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={nameId} className="text-xs font-semibold text-ink-muted">
              Save as
            </label>
            <Tooltip text={PRESET_ACTION_TOOLTIPS.savePresetName} hint="Save as" />
          </div>
          <input
            id={nameId}
            type="text"
            value={presetName}
            placeholder="Preset name"
            onChange={(event) => {
              const nextName = event.target.value;
              const adopted = findByName(
                customPresets.filter((preset) => preset.projectId === target),
                nextName,
              );
              setPresetName(nextName);
              // Adopt once, when the name starts naming a preset it was not naming before. Matched
              // by the rule the store saves by, so what the box shows and what Update writes are
              // decided by one function rather than by two that could disagree.
              if (adopted !== undefined && adopted.id !== followedId) {
                setFollowedId(adopted.id);
                setDescription(adopted.description);
              }
            }}
            className="w-full rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs text-ink transition-colors focus:border-accent"
          />
        </div>

        <div className="min-w-48 flex-1">
          {/* The ⓘ again, for the same reason as the name box beside it. */}
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={descriptionId} className="text-xs font-semibold text-ink-muted">
              Describe it (optional)
            </label>
            <Tooltip text={PRESET_ACTION_TOOLTIPS.savePresetDescription} hint="Describe it (optional)" />
          </div>
          <input
            id={descriptionId}
            type="text"
            value={description}
            placeholder="What it is for"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            className="w-full rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs text-ink transition-colors focus:border-accent"
          />
        </div>

        <div className="min-w-48 flex-1">
          <ProjectSelectField
            label="Save into"
            tooltip={PROJECT_ACTION_TOOLTIPS.savePresetProject}
            value={target}
            onChange={(next) => {
              setProjectId(next);
              // The adoption above is scoped to a project, so a preset adopted from the project
              // being left has nothing to do with the one being entered. Releasing it here is what
              // lets the box adopt again from whatever the new project holds under this name.
              setFollowedId(null);
            }}
          />
        </div>

        <ControlTooltip hint={overwrites ? 'Update' : 'Save'} text={PRESET_ACTION_TOOLTIPS.savePreset}>
          <button
            type="button"
            disabled={isSaving || presetName.trim() === '' || target === ''}
            onClick={async () => {
              setIsSaving(true);
              try {
                // Cleared only when it was actually stored. The store reports a failed write with a
                // toast and resolves normally, so emptying the box unconditionally would make the
                // user retype the name to retry. The project is deliberately *not* reset: somebody
                // saving two presets in a row is saving them into the same project.
                if (await saveCustomPreset(presetName, description, target)) {
                  setPresetName('');
                  setDescription('');
                  setFollowedId(null);
                }
              } finally {
                setIsSaving(false);
              }
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : overwrites ? 'Update' : 'Save'}
          </button>
        </ControlTooltip>
      </div>
    </section>
  );
}
