import { CUSTOM_ICONS_TABLE } from './schema.ts';

/**
 * The statements that read and write each project's library of icons of the reader's own, against the
 * `custom_icon_entries` table `schema.ts` declares.
 *
 * Filed beside the DDL rather than inside it because they are this one collection's, and `schema.ts`
 * is the whole database's definition. The entry is one JSON column (`entry_json`) rather than a column
 * per field, because it is read and written whole and `parseCustomIconEntry` holds it to
 * `checkCustomIcon` on the way back, whichever backend stored it.
 */

/**
 * Every project's library, most recently written first — the order the presets are listed in, and for
 * their reason. The catalogue dialog shelves the entries by role, so nothing on screen depends on it.
 */
export const SELECT_CUSTOM_ICONS_SQL = `
SELECT id, project_id, entry_json, updated_at
FROM ${CUSTOM_ICONS_TABLE}
ORDER BY updated_at DESC
`;

/**
 * Write one, replacing whatever stood under that id — adding an entry and changing one are the same
 * statement, which is what lets the store decide between them by reusing the library row's id.
 */
export const INSERT_CUSTOM_ICON_SQL = `
INSERT OR REPLACE INTO ${CUSTOM_ICONS_TABLE} (id, project_id, entry_json, updated_at)
VALUES (?, ?, ?, ?)
`;

export const DELETE_CUSTOM_ICON_SQL = `DELETE FROM ${CUSTOM_ICONS_TABLE} WHERE id = ?`;

/** A project's whole library — part of the cascade that deletes a project with what is in it. */
export const DELETE_CUSTOM_ICONS_BY_PROJECT_SQL = `DELETE FROM ${CUSTOM_ICONS_TABLE} WHERE project_id = ?`;

/** Every project's library — one of the four deletes an imported library pack begins with. */
export const DELETE_ALL_CUSTOM_ICONS_SQL = `DELETE FROM ${CUSTOM_ICONS_TABLE}`;
