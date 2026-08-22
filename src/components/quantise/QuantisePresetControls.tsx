import { useState } from 'react';
import { QUANTISE_PRESET_GUIDANCE } from '../../constants/quantisePresets.ts';
import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { findPresetByName } from '../../utils/presetNames.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TextField } from '../common/TextField.tsx';
import { QuantisePresetList } from './QuantisePresetList.tsx';
import { QuantisePresetTransferControls } from './QuantisePresetTransferControls.tsx';

/**
 * Saving the tab's dials under a name, and the collection of names already saved.
 *
 * **The one panel here that is not about the sheet on screen.** Every other control on this tab
 * describes *this* raster — its scale, its key colour, the palette taken off its result — and this
 * describes the reader's own way of working: the positions they arrived at after ten minutes of
 * moving sliders, kept so the next sheet does not start from the defaults again. That is why it
 * sits with the dials rather than on the Presets tab, which is the studio's library and holds a
 * different kind of thing entirely — see `QuantisePreset`.
 *
 * It reads the store rather than taking the dials as props, deliberately. The tab's transform runs
 * on a debounce, so a panel handed the positions as props would be one render behind the sliders
 * whenever a save landed mid-flight, and would store a setting the reader had already moved past.
 * `saveQuantisePreset` reads `useQuantiseStore` at the moment of the press instead.
 */
export function QuantisePresetControls() {
  const presets = useQuantisePresetStore((state) => state.presets);
  const saveQuantisePreset = useQuantisePresetStore((state) => state.saveQuantisePreset);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // The store's save is asynchronous and the button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same settings twice.
  const [isSaving, setIsSaving] = useState(false);

  // Derived during render, by the rule the store saves by, so the button cannot promise one thing
  // and the store do another. Saying "Update" before the press is what makes a confirmation
  // unnecessary.
  const overwrites = findPresetByName(presets, name);

  const save = async () => {
    setIsSaving(true);
    try {
      // Cleared only when it was actually stored: the store reports a failed write with a toast and
      // resolves normally, so emptying the boxes unconditionally would make the reader retype the
      // name to retry.
      if (await saveQuantisePreset(name, description)) {
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

        {/*
          In the heading row rather than beside Save, and pushed to the far end of it. Import is
          reachable on a collection that is empty — which is the visit where somebody arriving with
          a colleague's file most needs it — while the save row below is about the dials the tab is
          currently at, and two more buttons on the end of two text fields and a Save would wrap on
          the first narrow viewport.
        */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <QuantisePresetTransferControls />
        </div>
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

        <ControlTooltip
          hint={overwrites ? 'Update' : 'Save'}
          text={QUANTISE_ACTION_TOOLTIPS.saveQuantisePreset}
        >
          <button
            type="button"
            disabled={isSaving || name.trim() === ''}
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
