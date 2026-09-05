import { PRESETS } from '../../constants/presets/index.ts';
import { PresetLibrary } from './PresetLibrary.tsx';

/**
 * The built-in archetype library: what it is above, and the browser below.
 *
 * **Saving happens elsewhere now**, and so does everything to do with the reader's own presets.
 * This tab carried a save panel and a collection called "Your presets"; both moved when projects
 * arrived — the save panel to the Studio, where the configuration being saved is on screen, and the
 * saved presets to the Projects view, where they are filed under the game or job they were made
 * for. What is left is the library the app ships, which is browsing material rather than anything
 * the reader owns.
 *
 * Loading a built-in replaces the whole studio setup, so it is a starting point to work from rather
 * than a finished answer. What it does *not* touch is the two companion outputs, which stay as the
 * user set them; see `OutputConfig` for why an archetype has no opinion about those.
 */
export function PresetsTab() {
  return (
    <div className="animate-view-fade-in space-y-6">
      <section className="glass-panel rounded-2xl border border-foundry-700 p-6 shadow-xl">
        <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Preset Archetype Library</h2>
        <p className="text-xs text-ink-muted">
          {/* Counted rather than written out: the library grows, and a number in this sentence would
              be the copy that stopped being true first. The *categories* were written out anyway,
              one clause later — so adding VEHICLE left this paragraph naming five of six, with the
              collection list directly below it disagreeing. The list the sidebar renders is the one
              that cannot go stale, so this sentence points at it rather than restating it. */}
          {PRESETS.length} built-in templates spanning every subject category — every render style, camera and
          sheet mode the studio offers. Your own saved presets live on the Projects tab.
        </p>
      </section>

      <PresetLibrary />
    </div>
  );
}
