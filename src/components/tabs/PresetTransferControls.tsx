import { PRESET_PACK_ITEMS } from '../../constants/packImport.ts';
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
  const pendingImport = usePresetStore((state) => state.pendingImport);
  const savedCount = usePresetStore((state) => state.customPresets.length);
  const confirmPresetImport = usePresetStore((state) => state.confirmPresetImport);
  const cancelPresetImport = usePresetStore((state) => state.cancelPresetImport);

  return (
    <JsonPackTransfer
      filename={PACK_FILENAME}
      exportPack={exportPresetsJSON}
      importPack={importPresetsJSON}
      pendingImport={
        pendingImport === null
          ? null
          : {
              incoming: pendingImport.length,
              replacing: savedCount,
              noun: PRESET_PACK_ITEMS,
              confirmGuidance: PRESET_ACTION_TOOLTIPS.confirmImportPresets,
              cancelGuidance: PRESET_ACTION_TOOLTIPS.cancelImportPresets,
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the question leaves as it does.
              onConfirm: () => {
                void confirmPresetImport();
              },
              onCancel: cancelPresetImport,
            }
      }
      isTransferring={isExporting}
      canExport
      exportGuidance={PRESET_ACTION_TOOLTIPS.exportPresets}
      importGuidance={PRESET_ACTION_TOOLTIPS.importPresets}
    />
  );
}
