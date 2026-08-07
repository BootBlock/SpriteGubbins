import { useId, useRef, useState } from 'react';
import { PRESETS } from '../../constants/presets/index.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { PresetCard } from './PresetCard.tsx';

/** The filename an exported pack arrives as. */
const PACK_FILENAME = 'sprite-gubbins-presets.json';

/**
 * The archetype library: the six built-ins, plus whatever the user has saved.
 *
 * Both kinds render identically because they are the same shape — a category, a subject and an output
 * configuration — and loading either replaces the studio wholesale. The difference is only that a
 * built-in cannot be deleted.
 */
export function PresetsTab() {
  const customPresets = usePresetStore((state) => state.customPresets);
  const isExporting = usePresetStore((state) => state.isExporting);
  const loadPreset = usePresetStore((state) => state.loadPreset);
  const saveCustomPreset = usePresetStore((state) => state.saveCustomPreset);
  const deleteCustomPreset = usePresetStore((state) => state.deleteCustomPreset);
  const exportPresetsJSON = usePresetStore((state) => state.exportPresetsJSON);
  const importPresetsJSON = usePresetStore((state) => state.importPresetsJSON);
  const download = useDownload();

  const [presetName, setPresetName] = useState('');
  // The store's save is asynchronous and its button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same configuration twice under two different ids.
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const importId = useId();

  return (
    <div className="animate-fade-in space-y-6">
      <section className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-foundry-700 p-6 shadow-xl">
        <div>
          <h2 className="bg-gradient-to-r from-ink to-accent-soft bg-clip-text text-lg font-bold text-transparent">
            Preset Archetype Library
          </h2>
          <p className="text-xs text-ink-muted">
            Templates spanning characters, creatures, objects, items and buildings.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-foundry-700 bg-foundry-950 p-2">
          <div>
            <label htmlFor={nameId} className="mb-1 block text-[10px] font-semibold text-ink-faint">
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
            className="rounded-lg bg-accent-strong px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-foundry-700 disabled:text-ink-faint"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => {
              download(PACK_FILENAME, exportPresetsJSON(), 'application/json');
            }}
            className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            <span aria-hidden="true">📤</span> Export JSON
          </button>

          {/*
            A real button that opens the file picker, rather than a `<label>` wrapping the input.
            The input itself cannot be the visible control — `hidden` would make it unreachable by
            keyboard, and `sr-only` would put the focus ring somewhere nobody can see — while
            styling a label to look like a button and giving it its own focus ring would
            re-implement the global `:focus-visible` rule that `index.css` already owns.
          */}
          <button
            type="button"
            disabled={isExporting}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            <span aria-hidden="true">📥</span> Import JSON
          </button>
          <input
            ref={fileInputRef}
            id={importId}
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              // Cleared afterwards so re-picking the same file fires `change` again — otherwise a
              // failed import could not simply be retried.
              void importPresetsJSON(file).then(() => {
                input.value = '';
              });
            }}
          />
        </div>
      </section>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...PRESETS, ...customPresets].map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onLoad={loadPreset}
            onDelete={(target) => {
              void deleteCustomPreset(target.id);
            }}
          />
        ))}
      </ul>
    </div>
  );
}
