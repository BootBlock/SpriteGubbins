import type { PromptHistoryLog } from '../types/history.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';
import type { PersistenceBackend } from './backend.ts';
import { parseSettings } from './settingsParser.ts';

/**
 * The backend for a tab whose database is open in another tab of the same origin.
 *
 * **It exists because the answer to that is neither of the other two.** SQLite's SAH-pool VFS is
 * single-writer by design, so the second tab genuinely cannot take the access handles the first one
 * holds — that is a browser fact, not a defect. The defect was what the app did with it: it treated
 * "another tab of this app has the database open" as though it were "this browser has no OPFS", and
 * the localStorage fallback is exactly the wrong answer to the first. There *is* a library, it holds
 * the reader's work, and writing a second one beside it is how a reader comes to have two of
 * everything — driven in Edge, the second tab opened on `Default 0` over a library that was not
 * empty, saved a preset into a store the first tab could not see, and lost it the moment the first
 * tab closed and the second reloaded onto the real database.
 *
 * **So it reads nothing and writes nothing, and says which it is.** Reading nothing rather than
 * refusing is deliberate: every store hydrates on boot, and a backend that rejected each of those
 * would open the app under a stack of error notifications describing one condition six times.
 * Writing nothing is the opposite case and is refused *loudly*, because a write is a thing the
 * reader did on purpose and a silent no-op is how work disappears — {@link HELD_ELSEWHERE_REFUSAL}
 * is what every one of them rejects with, and the app's existing failure paths put it in front of
 * the reader.
 *
 * **`fetchProjects` is the one read that would have written**, and it is the reason the refusal is
 * on the writes rather than on the reads. It answers an empty `listProjects` by *creating* a Default
 * project, which is right on a first visit and is precisely how the second library got started here.
 * The rejection stops it before `set`, so nothing is stored and nothing is shown — the store needs
 * no knowledge of which backend it got, which is the rule `backend.ts` states and the reason this is
 * a third implementation of that interface rather than a flag on one of the others.
 *
 * The settings are the single exception, and are the app's own defaults rather than nothing: they
 * are what the interface is documented to answer where none are stored, they decide how the page
 * renders rather than what it holds, and a tab that came up with no accent, no motion setting and no
 * theme would be reporting this condition by breaking rather than by describing it.
 */

/** What every write rejects with, and what the reader is shown when one is attempted. */
export const HELD_ELSEWHERE_REFUSAL =
  'Your library is open in another tab of Sprite Gubbins, which is the only tab that may write to it. Close that tab and reload this one.';

export class HeldElsewhereBackend implements PersistenceBackend {
  readonly kind = 'held-elsewhere' as const;

  /**
   * One rejection, built per call.
   *
   * A shared rejected promise would be settled once and reported as an unhandled rejection the
   * moment it was created with nobody yet attached to it, which is a console error on every boot of
   * a second tab for a promise the app handles perfectly well a moment later.
   */
  private refuse(): Promise<never> {
    return Promise.reject(new Error(HELD_ELSEWHERE_REFUSAL));
  }

  addHistoryLog(_log: PromptHistoryLog): Promise<void> {
    return this.refuse();
  }

  listHistoryLogs(): Promise<PromptHistoryLog[]> {
    return Promise.resolve([]);
  }

  deleteHistoryLog(_id: string): Promise<void> {
    return this.refuse();
  }

  clearHistoryLogs(): Promise<void> {
    return this.refuse();
  }

  listProjects(): Promise<Project[]> {
    return Promise.resolve([]);
  }

  saveProject(_project: Project): Promise<void> {
    return this.refuse();
  }

  deleteProject(_id: string): Promise<void> {
    return this.refuse();
  }

  savePreset(_preset: CustomArchetype): Promise<void> {
    return this.refuse();
  }

  listPresets(): Promise<CustomArchetype[]> {
    return Promise.resolve([]);
  }

  deletePreset(_id: string): Promise<void> {
    return this.refuse();
  }

  saveQuantisePreset(_preset: QuantisePreset): Promise<void> {
    return this.refuse();
  }

  listQuantisePresets(): Promise<QuantisePreset[]> {
    return Promise.resolve([]);
  }

  deleteQuantisePreset(_id: string): Promise<void> {
    return this.refuse();
  }

  replaceLibrary(_pack: LibraryPack): Promise<void> {
    return this.refuse();
  }

  loadSettings(): Promise<AppSettings> {
    // The defaults, not a refusal — see the note at the top of the file on why this one differs.
    return Promise.resolve(parseSettings(undefined));
  }

  saveSettings(_settings: AppSettings): Promise<void> {
    return this.refuse();
  }

  loadSession(): Promise<StudioSession | null> {
    return Promise.resolve(null);
  }

  saveSession(_session: StudioSession): Promise<void> {
    return this.refuse();
  }
}
