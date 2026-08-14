import { useId, useState } from 'react';
import { PRESETS } from '../../constants/presets/index.ts';
import { PRESET_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { findPresetByName } from '../../utils/presetNames.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
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
  /**
   * The description exactly as it will be saved — **the box always holds what Save is about to
   * write**, and that invariant is the whole design.
   *
   * Saving writes what is here, so a box that sat empty while the name grew into one the library
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
  // The store's save is asynchronous and its button is otherwise disabled only on a blank name, so
  // without this a double-press writes the same configuration twice.
  const [isSaving, setIsSaving] = useState(false);
  const nameId = useId();
  const descriptionId = useId();

  // Derived during render, by the rule the store saves by, so the button cannot promise one thing
  // and the store do another. Saying "Update" before the press is what makes a confirm unnecessary.
  const overwrites = findPresetByName(customPresets, presetName);

  return (
    <section className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-foundry-700 p-6 shadow-xl">
      <div>
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Preset Archetype Library</h2>
        <p className="text-xs text-ink-muted">
          {/* Counted rather than written out: the library grows, and a number in this sentence would
              be the copy that stopped being true first. The *categories* were written out anyway,
              one clause later — so adding VEHICLE left this paragraph naming five of six, with the
              collection list directly below it disagreeing. The list the sidebar renders is the one
              that cannot go stale, so this sentence points at it rather than restating it. */}
          {PRESETS.length} built-in templates spanning every subject category — every render style, camera and
          sheet mode the studio offers.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-foundry-700 bg-foundry-950 p-2">
        <div>
          {/* The ⓘ, not a card on the field itself: this is a labelled box holding a value, which is
              what that affordance has always marked, and a card revealed by focusing a field sits
              over the library below for as long as the caret is in it. */}
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={nameId} className="text-xs font-semibold text-ink-faint">
              Save the current studio setup as
            </label>
            <Tooltip text={PRESET_ACTION_TOOLTIPS.savePresetName} hint="Save the current studio setup as" />
          </div>
          <input
            id={nameId}
            type="text"
            value={presetName}
            placeholder="Preset name"
            onChange={(event) => {
              const nextName = event.target.value;
              const adopted = findPresetByName(customPresets, nextName);
              setPresetName(nextName);
              // Adopt once, when the name starts naming a preset it was not naming before. Matched
              // by the rule the store saves by, so what the box shows and what Update writes are
              // decided by one function rather than by two that could disagree.
              if (adopted !== undefined && adopted.id !== followedId) {
                setFollowedId(adopted.id);
                setDescription(adopted.description);
              }
            }}
            className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs text-ink transition-colors focus:border-accent"
          />
        </div>

        <div>
          {/* The ⓘ again, for the same reason as the name box beside it. */}
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={descriptionId} className="text-xs font-semibold text-ink-faint">
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
            className="w-64 max-w-full rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs text-ink transition-colors focus:border-accent"
          />
        </div>

        <ControlTooltip hint={overwrites ? 'Update' : 'Save'} text={PRESET_ACTION_TOOLTIPS.savePreset}>
          <button
            type="button"
            disabled={isSaving || presetName.trim() === ''}
            onClick={async () => {
              setIsSaving(true);
              try {
                // Cleared only when it was actually stored. The store reports a failed write with a
                // toast and resolves normally, so emptying the box unconditionally would make the
                // user retype the name to retry. All three go back to their opening state together
                // — a preset left half-selected is what would make the next save adopt nothing.
                if (await saveCustomPreset(presetName, description)) {
                  setPresetName('');
                  setDescription('');
                  setFollowedId(null);
                }
              } finally {
                setIsSaving(false);
              }
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : overwrites ? 'Update' : 'Save'}
          </button>
        </ControlTooltip>

        <PresetTransferControls />
      </div>
    </section>
  );
}
