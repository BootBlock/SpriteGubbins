import { PresetLibrary } from './PresetLibrary.tsx';
import { PresetSavePanel } from './PresetSavePanel.tsx';

/**
 * The preset library: making one above, finding one below.
 *
 * Composition only — both panels reach into the store themselves, so nothing is threaded through this
 * file and it does not have to change when either of them does.
 *
 * Built-ins and saved presets are the same shape — a category, a subject and an output configuration —
 * and loading either replaces the studio wholesale. The only difference is that a built-in cannot be
 * renamed or deleted, which is a property of the card rather than of this layout.
 */
export function PresetsTab() {
  return (
    <div className="animate-view-fade-in space-y-6">
      <PresetSavePanel />
      <PresetLibrary />
    </div>
  );
}
