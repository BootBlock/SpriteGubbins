import type { Database } from '@sqlite.org/sqlite-wasm';
import { CREATE_TABLES_SQL, DROP_SCHEMA_OBJECT_SQL, SCHEMA_OBJECTS_SQL } from './schema.ts';
import { readString, isRecord } from './readers.ts';
import { transact } from './sqliteBindings.ts';
import { select } from './sqliteRequests.ts';

/** One schema object: what it is, what it is called, and the statement that declares it. */
interface SchemaObject {
  readonly type: string;
  readonly name: string;
  readonly statement: string;
}

/** Every object a database declares, keyed by its type and name. */
type SchemaShape = ReadonlyMap<string, SchemaObject>;

function text(row: unknown, column: string): string {
  return isRecord(row) ? (readString(row, column) ?? '') : '';
}

/**
 * A `CREATE` statement with its layout taken out: every run of whitespace is one space, and none is
 * left beside a bracket or a comma.
 *
 * So reflowing `schema.ts` — a line broken, an indent changed — is the same statement, and changes
 * nothing for a database that already exists. Everything else in the text is compared, and that is
 * the point of comparing text: SQLite keeps each object's `CREATE` statement as it was written, so
 * a change to any part of what it means — a type, a constraint, a collation, a key, a `CHECK`, an
 * index's expression or `WHERE` — is a different statement. The pragmas that describe a table
 * report only some of those, and a database kept over a difference they cannot see is one whose
 * statements fail for as long as it lives.
 *
 * The cost falls the safe way. Columns declared in another order, a keyword in another case, or a
 * comment inside a statement read as a change, and the library is discarded over a schema that
 * means the same thing. Whitespace inside a string literal is folded too, which could only matter
 * to two `DEFAULT`s that differ by nothing else.
 */
function withoutLayout(statement: string): string {
  return statement
    .replace(/\s+/g, ' ')
    .replace(/ ?([(),]) ?/g, '$1')
    .trim();
}

/**
 * Every object this database declares, each keyed by its type and name.
 *
 * `sqlite_`-prefixed names are SQLite's own, and have no statement of their own to compare: the
 * index behind a `PRIMARY KEY` or a `UNIQUE` constraint is made by, and follows from, its table's.
 */
function schemaOf(database: Database): SchemaShape {
  const shape = new Map<string, SchemaObject>();
  for (const object of select(database, SCHEMA_OBJECTS_SQL)) {
    const type = text(object, 'type');
    const name = text(object, 'name');
    shape.set(`${type} ${name}`, { type, name, statement: withoutLayout(text(object, 'sql')) });
  }
  return shape;
}

/**
 * Whether every object stored is one the DDL declares, declared by the same statement.
 *
 * One way only. An object the DDL declares and the database lacks is a table a release has added,
 * and `CREATE_TABLES_SQL` makes it on the same boot — refusing a database for lacking it would
 * discard every library on every release that adds a table. An object the database has and the DDL
 * does not is one a release has **retired**, and no statement names it again, so left alone it
 * would survive every boot with whatever it held.
 */
function isCompatible(stored: SchemaShape, declared: SchemaShape): boolean {
  for (const [key, object] of stored) {
    if (declared.get(key)?.statement !== object.statement) return false;
  }
  return true;
}

/**
 * Drop every table and view the database holds, as one transaction.
 *
 * Indexes and triggers go with the table they belong to, and SQLite's own objects cannot be dropped
 * and are not asked to be. Inside a transaction, so a failure partway leaves the database as it was
 * rather than half of it — the half this discard exists never to leave.
 */
function dropEverything(database: Database, stored: SchemaShape): void {
  transact(database, () => {
    for (const { type, name } of stored.values()) {
      if (type === 'table' || type === 'view') database.exec(DROP_SCHEMA_OBJECT_SQL(type, name));
    }
  });
}

/**
 * Discard the stored database whole if any part of it is not what `CREATE_TABLES_SQL` declares.
 *
 * This runs **before** that DDL, and is what makes its `IF NOT EXISTS` safe to change: on its own,
 * adding a column leaves an existing database with the old table, and every statement naming the new
 * column fails for the life of that database. It is a discard and not a migration — there is no
 * version, no upgrade step and no translation of a stored row into a newer shape. Pre-1.0 that is the
 * bargain; see CLAUDE.md, “No backwards compatibility before 1.0.0”.
 *
 * **The database, never one table of it.** The tables refer to one another — both preset tables file
 * each row under a `project_id` — and the cascade in `deleteProject` and the transaction in
 * `replaceLibrary` exist so that link is never broken. Dropping only the table whose shape changed
 * broke it at boot: a change to `projects` kept every preset, filed under a project that no longer
 * existed, which the Projects tab counted in its header and listed under nothing.
 *
 * What the DDL declares is read the same way as what is stored, from `scratch` — an empty database
 * the caller supplies and owns — after the DDL has run in it. So SQLite itself says what the schema
 * is, and there is no second, hand-written statement of it to drift from the first.
 */
export function discardIncompatibleDatabase(stored: Database, scratch: Database): void {
  scratch.exec(CREATE_TABLES_SQL);
  const held = schemaOf(stored);
  if (isCompatible(held, schemaOf(scratch))) return;
  dropEverything(stored, held);
}
