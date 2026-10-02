import type { Database } from '@sqlite.org/sqlite-wasm';
import type { LibraryPack } from '../types/libraryPack.ts';
import {
  DELETE_ALL_CUSTOM_ICONS_SQL,
  DELETE_CUSTOM_ICONS_BY_PROJECT_SQL,
  INSERT_CUSTOM_ICON_SQL,
} from './customIconStatements.ts';
import {
  DELETE_ALL_PRESETS_SQL,
  DELETE_ALL_PROJECTS_SQL,
  DELETE_ALL_QUANTISE_PRESETS_SQL,
  DELETE_PRESETS_BY_PROJECT_SQL,
  DELETE_PROJECT_SQL,
  DELETE_QUANTISE_PRESETS_BY_PROJECT_SQL,
  INSERT_PRESET_SQL,
  INSERT_PROJECT_SQL,
  INSERT_QUANTISE_PRESET_SQL,
} from './schema.ts';
import {
  customIconBindings,
  presetBindings,
  projectBindings,
  quantisePresetBindings,
  transact,
} from './sqliteBindings.ts';

/**
 * The two requests that touch every saved collection at once, each as one transaction.
 *
 * The SQLite twin of `localStorageLibrary.ts`, and filed apart from `sqliteRequests.ts` for the
 * reason that one is filed apart from its backend: these leave four tables consistent with one
 * another, which is a different job from running one statement against one. Here a transaction is
 * the whole of the guarantee; the fallback, which has none, says there what it promises instead.
 */

/**
 * Remove a project and everything filed under it — its presets, its sets of dials and its icon
 * library — as one transaction, because a project removed while anything filed under it survived
 * would leave rows naming a container that is no longer there, and nothing above this can show or
 * repair that.
 */
export function deleteProjectIn(database: Database, projectId: string): void {
  transact(database, () => {
    database.exec(DELETE_PRESETS_BY_PROJECT_SQL, { bind: [projectId] });
    database.exec(DELETE_QUANTISE_PRESETS_BY_PROJECT_SQL, { bind: [projectId] });
    database.exec(DELETE_CUSTOM_ICONS_BY_PROJECT_SQL, { bind: [projectId] });
    database.exec(DELETE_PROJECT_SQL, { bind: [projectId] });
  });
}

/**
 * Replace the projects and every saved collection with an imported pack's, as one transaction: they
 * refer to one another, so an import that failed between them would leave saves naming projects the
 * file was about to replace.
 *
 * Each project's own timestamps travel with it, so an imported library keeps the order it was exported
 * in rather than being flattened to the moment of the import. **One instant for every row of the three
 * saved collections**, so each arrives in the order the file lists it rather than in one the clock
 * decided between inserts. `SELECT … ORDER BY updated_at DESC` then leaves that order to SQLite's own
 * tie-breaking, which is the same answer the fallback gives: a pack is a collection, not a sequence of
 * saves.
 */
export function replaceLibraryIn(database: Database, pack: LibraryPack): void {
  transact(database, () => {
    database.exec(DELETE_ALL_PROJECTS_SQL);
    database.exec(DELETE_ALL_PRESETS_SQL);
    database.exec(DELETE_ALL_QUANTISE_PRESETS_SQL);
    database.exec(DELETE_ALL_CUSTOM_ICONS_SQL);
    for (const project of pack.projects) {
      database.exec(INSERT_PROJECT_SQL, { bind: projectBindings(project) });
    }
    const updatedAt = Date.now();
    for (const preset of pack.presets) {
      database.exec(INSERT_PRESET_SQL, { bind: presetBindings(preset, updatedAt) });
    }
    for (const preset of pack.quantisePresets) {
      database.exec(INSERT_QUANTISE_PRESET_SQL, { bind: quantisePresetBindings(preset, updatedAt) });
    }
    for (const icon of pack.customIcons) {
      database.exec(INSERT_CUSTOM_ICON_SQL, { bind: customIconBindings(icon, updatedAt) });
    }
  });
}
