import { LIBRARY_PACK_ITEMS } from '../../constants/packImport.ts';
import { PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useLibraryTransferStore } from '../../stores/useLibraryTransferStore.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { JsonPackTransfer } from '../common/JsonPackTransfer.tsx';

/** The filename an exported pack arrives as. */
const PACK_FILENAME = 'sprite-gubbins-library.json';

/**
 * The library's transfer surface: which store it moves, and what the file is called.
 *
 * The control itself is {@link JsonPackTransfer}, which the two collections used to have one each.
 * There is one now, and it is here, because the file carries all three collections together — a
 * preset names its project, so a pack of presets without their projects describes a library that
 * cannot be assembled. What is left in this file is only what differs: the store, the filename, the
 * guidance, and this library's own answer to whether there is anything to export, which is always
 * yes — a pack carries the built-in archetypes, so it says something even on an install where
 * nothing has been saved.
 *
 * The count it offers to replace is the whole library rather than one collection, for the same
 * reason: what the reader is being asked about is everything they have.
 */
export function ProjectTransferControls() {
  const isTransferring = useLibraryTransferStore((state) => state.isTransferring);
  const exportLibraryJSON = useLibraryTransferStore((state) => state.exportLibraryJSON);
  const importLibraryJSON = useLibraryTransferStore((state) => state.importLibraryJSON);
  const pendingImport = useLibraryTransferStore((state) => state.pendingImport);
  const confirmLibraryImport = useLibraryTransferStore((state) => state.confirmLibraryImport);
  const cancelLibraryImport = useLibraryTransferStore((state) => state.cancelLibraryImport);
  const projectCount = useProjectStore((state) => state.projects.length);
  const presetCount = usePresetStore((state) => state.customPresets.length);
  const dialCount = useQuantisePresetStore((state) => state.presets.length);

  return (
    <JsonPackTransfer
      filename={PACK_FILENAME}
      exportPack={exportLibraryJSON}
      importPack={importLibraryJSON}
      pendingImport={
        pendingImport === null
          ? null
          : {
              incoming:
                pendingImport.projects.length +
                pendingImport.presets.length +
                pendingImport.quantisePresets.length,
              replacing: projectCount + presetCount + dialCount,
              noun: LIBRARY_PACK_ITEMS,
              confirmGuidance: PROJECT_ACTION_TOOLTIPS.confirmImportLibrary,
              cancelGuidance: PROJECT_ACTION_TOOLTIPS.cancelImportLibrary,
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the question leaves as it does.
              onConfirm: () => {
                void confirmLibraryImport();
              },
              onCancel: cancelLibraryImport,
            }
      }
      isTransferring={isTransferring}
      canExport
      exportGuidance={PROJECT_ACTION_TOOLTIPS.exportLibrary}
      importGuidance={PROJECT_ACTION_TOOLTIPS.importLibrary}
    />
  );
}
