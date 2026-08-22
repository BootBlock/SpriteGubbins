import { PRESET_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { JsonPackTransfer } from '../common/JsonPackTransfer.tsx';

/** The filename an exported pack arrives as. */
const PACK_FILENAME = 'sprite-gubbins-presets.json';

/**
 * The archetype library's transfer surface: which store it moves, and what it is called.
 *
 * The control itself is {@link JsonPackTransfer}, shared with the quantiser's collection. What is
 * here is only what differs — the store, the filename, the guidance, and this library's own answer
 * to whether there is anything to export, which is always yes: an exported pack carries the
 * built-ins, so it says something even on an install where nothing has been saved.
 *
 * Its own file because it is the library's *transfer* surface rather than part of saving one
 * preset — it has no interest in the studio's current configuration.
 */
export function PresetTransferControls() {
  const isExporting = usePresetStore((state) => state.isExporting);
  const exportPresetsJSON = usePresetStore((state) => state.exportPresetsJSON);
  const importPresetsJSON = usePresetStore((state) => state.importPresetsJSON);

  return (
    <JsonPackTransfer
      filename={PACK_FILENAME}
      exportPack={exportPresetsJSON}
      importPack={importPresetsJSON}
      isTransferring={isExporting}
      canExport
      exportGuidance={PRESET_ACTION_TOOLTIPS.exportPresets}
      importGuidance={PRESET_ACTION_TOOLTIPS.importPresets}
    />
  );
}
