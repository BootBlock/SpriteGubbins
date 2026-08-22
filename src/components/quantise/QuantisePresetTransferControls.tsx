import { QUANTISE_PACK_ITEMS } from '../../constants/packImport.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { JsonPackTransfer } from '../common/JsonPackTransfer.tsx';

/** The filename an exported collection arrives as. */
const PACK_FILENAME = 'sprite-gubbins-quantiser-settings.json';

/**
 * The quantiser collection's transfer surface: which store it moves, and what it is called.
 *
 * The control itself is {@link JsonPackTransfer}, shared with the studio's library. What is here is
 * only what differs — the store, the filename, the guidance, and the one judgement this collection
 * makes for itself: an export of nothing is a file the parser refuses, since obeying an empty pack
 * would delete the collection it landed in, so the button is not offered on an empty collection.
 *
 * Its own file rather than inline in the panel because these are the collection's *transfer*
 * concerns rather than part of saving one set of dials.
 */
export function QuantisePresetTransferControls() {
  const isTransferring = useQuantisePresetStore((state) => state.isTransferring);
  const exportQuantisePresetsJSON = useQuantisePresetStore((state) => state.exportQuantisePresetsJSON);
  const importQuantisePresetsJSON = useQuantisePresetStore((state) => state.importQuantisePresetsJSON);
  const savedCount = useQuantisePresetStore((state) => state.presets.length);
  const pendingImport = useQuantisePresetStore((state) => state.pendingImport);
  const confirmQuantisePresetImport = useQuantisePresetStore((state) => state.confirmQuantisePresetImport);
  const cancelQuantisePresetImport = useQuantisePresetStore((state) => state.cancelQuantisePresetImport);

  return (
    <JsonPackTransfer
      filename={PACK_FILENAME}
      exportPack={exportQuantisePresetsJSON}
      importPack={importQuantisePresetsJSON}
      pendingImport={
        pendingImport === null
          ? null
          : {
              incoming: pendingImport.length,
              replacing: savedCount,
              noun: QUANTISE_PACK_ITEMS,
              confirmGuidance: QUANTISE_ACTION_TOOLTIPS.confirmImportQuantisePresets,
              cancelGuidance: QUANTISE_ACTION_TOOLTIPS.cancelImportQuantisePresets,
              onConfirm: () => {
                void confirmQuantisePresetImport();
              },
              onCancel: cancelQuantisePresetImport,
            }
      }
      isTransferring={isTransferring}
      canExport={savedCount > 0}
      exportGuidance={QUANTISE_ACTION_TOOLTIPS.exportQuantisePresets}
      importGuidance={QUANTISE_ACTION_TOOLTIPS.importQuantisePresets}
    />
  );
}
