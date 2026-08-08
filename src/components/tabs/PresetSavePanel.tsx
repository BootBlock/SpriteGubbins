import { useId, useState } from 'react';
import { PRESETS } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { findPresetByName } from '../../utils/presetNames.ts';
import { PresetTransferControls } from './PresetTransferControls.tsx';

/**
 * Putting the studio's current configuration *into* the library, and moving the library in and out.
 *
 * Its own panel above the browser, because it is the one control on this tab that reads the studio
 * rather than the library — everything below is about finding a preset, and this is about making one.
 */
export function PresetSavePanel() {
  const customPresets = usePresetStore((state) => state.customPresets);
  const saveCustomPreset = usePresetStore((state) => state.saveCustomPreset);

  const [presetName, setPresetName] = useState('');
  // The store's save is asynchronous and its button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same configuration twice.
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();

  // Derived during render, by the rule the store saves by, so the button cannot promise one thing
  // and the store do another. Saying "Update" before the press is what makes a confirm unnecessary.
  const overwrites = findPresetByName(customPresets, presetName);

  return (
    <section className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-foundry-700 p-6 shadow-xl">
      <div>
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Preset Archetype Library</h2>
        <p className="text-xs text-ink-muted">
          {/* Counted rather than written out: the library grows, and a number in this sentence would
              be the copy that stopped being true first. */}
          {PRESETS.length} built-in templates spanning characters, creatures, objects, items and buildings —
          every render style, camera and sheet mode the studio offers.
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
          className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving…' : overwrites ? 'Update' : 'Save'}
        </button>

        <PresetTransferControls />
      </div>
    </section>
  );
}
