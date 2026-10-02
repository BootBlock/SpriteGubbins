import type { CustomArchetype } from './preset.ts';
import type { Project } from './project.ts';
import type { QuantisePreset } from './quantisePreset.ts';
import type { SavedCustomIcon } from './savedCustomIcon.ts';

/**
 * Everything a reader has saved, as one value — the projects, and the studio archetypes, the sets of
 * quantiser dials and the icons of the reader's own filed under them.
 *
 * **One pack rather than four, because the four are not independent.** Each saved collection names
 * its project by id, so a file carrying presets without the projects they refer to describes a
 * library that cannot be assembled, and importing one collection while leaving another alone would
 * leave every entry in it pointing at a project that is no longer there. Moving the library between machines
 * means moving the whole of it, and replacing it means replacing the whole of it — in one
 * transaction, which is what `PersistenceBackend.replaceLibrary` promises.
 *
 * The built-in archetypes are **not** in it. An exported file carries them so that it reads on its
 * own, and the parser strips them again on the way in; see `utils/libraryPack.ts`, which is the
 * only code that knows about that pair.
 */
export interface LibraryPack {
  readonly projects: readonly Project[];
  readonly presets: readonly CustomArchetype[];
  readonly quantisePresets: readonly QuantisePreset[];
  /** Each project's library of icons of the reader's own. */
  readonly customIcons: readonly SavedCustomIcon[];
}
