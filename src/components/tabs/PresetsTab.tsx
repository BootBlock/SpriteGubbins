import { useId, useState } from 'react';
import { PRESETS } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { findPresetByName } from '../../utils/presetNames.ts';
import { PresetCard } from './PresetCard.tsx';
import { PresetTransferControls } from './PresetTransferControls.tsx';

/**
 * The archetype library: the six built-ins, plus whatever the user has saved.
 *
 * Both kinds render identically because they are the same shape — a category, a subject and an output
 * configuration — and loading either replaces the studio wholesale. The difference is only that a
 * built-in cannot be deleted.
 */
export function PresetsTab() {
  const customPresets = usePresetStore((state) => state.customPresets);
  const loadPreset = usePresetStore((state) => state.loadPreset);
  const saveCustomPreset = usePresetStore((state) => state.saveCustomPreset);
  const renameCustomPreset = usePresetStore((state) => state.renameCustomPreset);
  const deleteCustomPreset = usePresetStore((state) => state.deleteCustomPreset);

  const [presetName, setPresetName] = useState('');
  // The store's save is asynchronous and its button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same configuration twice.
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();

  // Derived during render, by the rule the store saves by, so the button cannot promise one thing
  // and the store do another. Saying "Update" before the press is what makes a confirm unnecessary.
  const overwrites = findPresetByName(customPresets, presetName);

  return (
    <div className="animate-fade-in space-y-6">
      <section className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-foundry-700 p-6 shadow-xl">
        <div>
          <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">
            Preset Archetype Library
          </h2>
          <p className="text-xs text-ink-muted">
            Templates spanning characters, creatures, objects, items and buildings.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-foundry-700 bg-foundry-950 p-2">
          <div>
            <label htmlFor={nameId} className="mb-1 block text-xs font-semibold text-ink-faint">
              Save the current studio setup as
            </label>
            <input
              id={nameId}
              type="text"
              value={presetName}
              placeholder="Preset name"
              onChange={(event) => {
                setPresetName(event.target.value);
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs text-ink transition-colors focus:border-accent"
            />
          </div>

          <button
            type="button"
            disabled={isSaving || presetName.trim() === ''}
            onClick={async () => {
              setIsSaving(true);
              try {
                // Cleared only when it was actually stored. The store reports a failed write with a
                // toast and resolves normally, so emptying the box unconditionally would make the
                // user retype the name to retry.
                if (await saveCustomPreset(presetName)) setPresetName('');
              } finally {
                setIsSaving(false);
              }
            }}
            className="rounded-lg bg-accent-strong px-3.5 py-1.5 text-xs font-semibold text-ink shadow-md transition-all duration-200 hover:bg-accent hover:shadow-lg active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-foundry-700 disabled:text-ink-faint disabled:shadow-none"
          >
            {isSaving ? 'Saving…' : overwrites ? 'Update' : 'Save'}
          </button>

          <PresetTransferControls />
        </div>
      </section>

      {/* The cards each carry their own entrance; this is what makes them arrive as a sweep across
          the row rather than all at once. */}
      <ul className="stagger-children grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...PRESETS, ...customPresets].map((preset, index) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            // Position in the combined list, so a saved preset simply continues round the wheel
            // from where the built-ins left off rather than restarting the sequence.
            index={index}
            onLoad={loadPreset}
            onRename={(target, name) => renameCustomPreset(target.id, name)}
            onDelete={(target) => {
              void deleteCustomPreset(target.id);
            }}
          />
        ))}
      </ul>
    </div>
  );
}
