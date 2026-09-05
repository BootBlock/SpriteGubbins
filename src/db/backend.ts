import type { PromptHistoryLog } from '../types/history.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';

/**
 * What the rest of the app is allowed to ask of storage.
 *
 * Two implementations satisfy it — SQLite over OPFS, and a localStorage fallback for browsers
 * or hosts where OPFS is unavailable. Everything above this line is written against the
 * interface, so no store or component ever branches on which one it got.
 *
 * Every method is async even where the fallback is synchronous: the SQLite path genuinely is
 * asynchronous, and a caller that only awaits *sometimes* would be a race waiting to happen.
 */
export interface PersistenceBackend {
  /**
   * Which implementation this is.
   *
   * Read by `components/tabs/StorageStatus.tsx` and shown on the Architecture tab, so a user can
   * tell where their data actually went — and so a database that silently failed to open stops
   * looking exactly like one that opened.
   */
  readonly kind: BackendKind;

  addHistoryLog(log: PromptHistoryLog): Promise<void>;
  listHistoryLogs(): Promise<PromptHistoryLog[]>;
  /** Remove one entry. Deleting an id that is not there is a no-op, not an error. */
  deleteHistoryLog(id: string): Promise<void>;
  clearHistoryLogs(): Promise<void>;

  /**
   * The projects the two saved collections below are filed under.
   *
   * There is no `replaceProjects` beside these: a project is deleted one at a time, and the only
   * thing that replaces the whole set is an import, which replaces all three collections together
   * through {@link replaceLibrary}.
   */
  listProjects(): Promise<Project[]>;
  /** Write one, replacing whatever stood under that id — both making and renaming go through it. */
  saveProject(project: Project): Promise<void>;
  /**
   * Remove one project **and everything filed under it**, in one transaction.
   *
   * The cascade is the backend's rather than the store's, and it has to be: two deletes issued from
   * above could leave a project gone with its presets still naming it, and there is no state the
   * app could show for that. Deleting an id that is not there is a no-op, not an error.
   */
  deleteProject(id: string): Promise<void>;

  savePreset(preset: CustomArchetype): Promise<void>;
  listPresets(): Promise<CustomArchetype[]>;
  deletePreset(id: string): Promise<void>;

  /**
   * The quantiser's saved dial positions.
   *
   * A collection of its own rather than more of {@link savePreset}'s, because the two hold
   * different things: an archetype describes a subject to *generate*, and one of these describes how
   * to read a raster that came **back**. They are separate collections and separate stores for that
   * reason, and they travel together in one file only because both are filed under the same
   * projects — see `types/libraryPack.ts`.
   */
  saveQuantisePreset(preset: QuantisePreset): Promise<void>;
  listQuantisePresets(): Promise<QuantisePreset[]>;
  /** Remove one. Deleting an id that is not there is a no-op, not an error. */
  deleteQuantisePreset(id: string): Promise<void>;

  /**
   * Replace the projects and both saved collections with the contents of an imported pack, in one
   * transaction.
   *
   * One method rather than three replaces, for the reason {@link LibraryPack} gives: a preset names
   * its project by id, so a partial replacement is a library that does not hold together. An
   * implementation that cannot offer a transaction has to reach the same end state or none of it —
   * see the fallback, which rewrites all three keys and says what it can and cannot promise.
   */
  replaceLibrary(pack: LibraryPack): Promise<void>;

  /**
   * The stored interface settings, or the defaults where nothing has been stored.
   *
   * The one read here that cannot come back empty. A missing row is the ordinary state of an install
   * whose owner has never opened the settings dialog, so "nothing stored" and "the defaults" are the
   * same answer, and returning it from the backend keeps every caller from having to know that.
   */
  loadSettings(): Promise<AppSettings>;
  /** Write the settings whole — they are edited and saved as one object, never field by field. */
  saveSettings(settings: AppSettings): Promise<void>;

  /**
   * The studio as it was left, or `null` where nothing has been stored.
   *
   * `null` rather than a default session, which is the opposite of {@link loadSettings} and is the
   * distinction that matters here: the settings' defaults *are* a complete answer, whereas a
   * reconstructed default session would be indistinguishable from a real one the user had left, and
   * restoring it would overwrite the studio's own boot state with a copy of itself. Absent has to
   * stay sayable.
   */
  loadSession(): Promise<StudioSession | null>;
  /** Write the session whole — the category, subject and output are only meaningful together. */
  saveSession(session: StudioSession): Promise<void>;
}

export const BACKEND_KINDS = ['sqlite-opfs', 'localstorage'] as const;
export type BackendKind = (typeof BACKEND_KINDS)[number];

/** How many history entries to keep. Old prompts are cheap, but not free, and nobody scrolls past this. */
export const HISTORY_LIMIT = 200;
