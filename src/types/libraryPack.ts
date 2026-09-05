import type { CustomArchetype } from './preset.ts';
import type { Project } from './project.ts';
import type { QuantisePreset } from './quantisePreset.ts';

/**
 * Everything a reader has saved, as one value — the projects, the studio archetypes filed under
 * them, and the sets of quantiser dials filed under them.
 *
 * **One pack rather than three, because the three are not independent.** A preset names its project
 * by id, so a file carrying presets without the projects they refer to describes a library that
 * cannot be assembled, and importing one collection while leaving another alone would leave every
 * preset in it pointing at a project that is no longer there. Moving the library between machines
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
}
