import { describe, expect, it } from 'vitest';
import { CREATE_TABLES_SQL, TABLE_COLUMNS } from './schema.ts';

/**
 * The DDL and the column sets the worker compares a stored table against, held to each other.
 *
 * `TABLE_COLUMNS` exists so the worker can discard a table whose shape no longer matches — which is
 * what makes changing the DDL safe against a database that already exists. That only works while
 * the two agree, and they are written down separately: the DDL because it is the readable statement
 * of the schema, the sets because parsing SQL at runtime would be a second thing to get wrong. So
 * the parsing happens here instead, where being brittle is cheap and a mismatch is a build failure
 * rather than a table silently dropped — or silently kept — on somebody's next visit.
 */

/** The column names one `CREATE TABLE` statement declares, in the order it declares them. */
function declaredColumns(table: string): readonly string[] {
  const body = new RegExp(String.raw`CREATE TABLE IF NOT EXISTS ${table} \(\n([\s\S]*?)\n\);`).exec(
    CREATE_TABLES_SQL,
  )?.[1];
  if (body === undefined) throw new Error(`the DDL should create "${table}".`);

  // Every column is declared on its own line as `  name TYPE …`; a trailing constraint line would
  // not open with an identifier, and there are none in this schema.
  return body
    .split('\n')
    .map((line) => /^\s{2}([a-z_]+)\s/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
}

describe('TABLE_COLUMNS', () => {
  it.each(Object.entries(TABLE_COLUMNS))('names exactly what the DDL declares for %s', (table, columns) => {
    expect(declaredColumns(table)).toEqual(columns);
  });

  it('covers every table the DDL creates', () => {
    // The other direction: a table added to the DDL and not to the record would never be checked,
    // so a later change to its columns would leave every existing database failing on it forever.
    const created = [...CREATE_TABLES_SQL.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(/g)].map(
      (match) => match[1],
    );

    expect(created.sort()).toEqual(Object.keys(TABLE_COLUMNS).sort());
  });
});
