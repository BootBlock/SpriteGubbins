import type { PromptHistoryLog } from '../types/history.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import {
  toCustomIconRow,
  toHistoryRow,
  toPresetRow,
  toProjectRow,
  toQuantisePresetRow,
} from './localStorageRows.ts';
import {
  parseCustomIconRow,
  parseHistoryRow,
  parsePresetRow,
  parseProjectRow,
  parseQuantisePresetRow,
} from './rows.ts';
import { STORAGE_KEYS } from './schema.ts';

/**
 * One collection the localStorage fallback keeps as an array of rows under one key: the key, the shared
 * parser that reads a row back, and the writer that makes one.
 *
 * The three travel together because they are only ever right together — a collection read with one
 * table's parser and written with another's is a key whose every row is dropped on the next read.
 */
export interface StoredCollection<T extends { readonly id: string }> {
  readonly key: string;
  readonly parse: (value: unknown) => T | null;
  readonly toRow: (entry: T) => Record<string, unknown>;
}

/**
 * Every collection the fallback keeps, each mirroring the SQLite table of the same rows: the backend's
 * own reads and writes and the multi-collection operations of `localStorageLibrary.ts` all name one of
 * these rather than restating its three parts.
 */
export const STORED_COLLECTIONS = {
  history: {
    key: STORAGE_KEYS.promptHistory,
    parse: parseHistoryRow,
    toRow: toHistoryRow,
  } satisfies StoredCollection<PromptHistoryLog>,
  projects: {
    key: STORAGE_KEYS.projects,
    parse: parseProjectRow,
    toRow: toProjectRow,
  } satisfies StoredCollection<Project>,
  presets: {
    key: STORAGE_KEYS.customPresets,
    parse: parsePresetRow,
    toRow: toPresetRow,
  } satisfies StoredCollection<CustomArchetype>,
  quantisePresets: {
    key: STORAGE_KEYS.quantisePresets,
    parse: parseQuantisePresetRow,
    toRow: toQuantisePresetRow,
  } satisfies StoredCollection<QuantisePreset>,
  customIcons: {
    key: STORAGE_KEYS.customIcons,
    parse: parseCustomIconRow,
    toRow: toCustomIconRow,
  } satisfies StoredCollection<SavedCustomIcon>,
} as const;

/**
 * The collections whose every row is filed under a project: what a project's delete empties of that
 * project, and what the boot-time discard empties with the projects (`discardIncompatibleLibrary.ts`).
 */
export const FILED_UNDER_A_PROJECT = [
  STORED_COLLECTIONS.presets,
  STORED_COLLECTIONS.quantisePresets,
  STORED_COLLECTIONS.customIcons,
] as const;
