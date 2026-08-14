import { useId, useRef } from 'react';
import { PRESET_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useDownload } from '../../hooks/useDownload.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/** The filename an exported pack arrives as. */
const PACK_FILENAME = 'sprite-gubbins-presets.json';

/**
 * Moving the whole preset library in and out as a JSON pack.
 *
 * Its own file because it is the library's *transfer* surface rather than part of saving one
 * preset — it has its own busy flag, its own file handle, and no interest in the studio's current
 * configuration.
 */
export function PresetTransferControls() {
  const isExporting = usePresetStore((state) => state.isExporting);
  const exportPresetsJSON = usePresetStore((state) => state.exportPresetsJSON);
  const importPresetsJSON = usePresetStore((state) => state.importPresetsJSON);
  const download = useDownload();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importId = useId();

  return (
    <>
      <ControlTooltip hint="Export JSON" text={PRESET_ACTION_TOOLTIPS.exportPresets}>
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
      </ControlTooltip>

      {/*
        A real button that opens the file picker, rather than a `<label>` wrapping the input.
        The input itself cannot be the visible control — `hidden` would make it unreachable by
        keyboard, and `sr-only` would put the focus ring somewhere nobody can see — while
        styling a label to look like a button and giving it its own focus ring would
        re-implement the global `:focus-visible` rule that `index.css` already owns.
      */}
      <ControlTooltip hint="Import JSON" text={PRESET_ACTION_TOOLTIPS.importPresets}>
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
      </ControlTooltip>
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
    </>
  );
}
