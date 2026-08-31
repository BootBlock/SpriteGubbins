import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Keeps `AGENTS.md`'s rule table honest about being "the complete list".
 *
 * `AGENTS.md` is the entry point for an agent that does not read `CLAUDE.md` in full, and it says
 * so: the rules it does not repeat are "one click away and equally binding". That promise rests
 * entirely on the table having a row for every section of `CLAUDE.md`, and the file's own
 * instruction to add one was the only thing holding it up. Four sections drifted in without a row —
 * one of them headed `(mandatory)` — because a hand-kept list in prose is exactly the kind of rule
 * that rots in one direction: `CLAUDE.md` grows, `AGENTS.md` does not.
 *
 * Both halves are machine-readable, so the drift does not have to be found in review. `CLAUDE.md`'s
 * `##` headings give the sections; each table row links the section it stands for, by the anchor
 * GitHub derives from that heading. This suite maps one onto the other and fails on a section with
 * no row, a row pointing at no section, and a section claimed by two rows.
 *
 * What it cannot judge is whether a row *describes* its section well, or whether a rule that
 * deserves repeating in full on the page has been. Those stay editorial.
 */
const CLAUDE_MD = resolve(process.cwd(), 'CLAUDE.md');
const AGENTS_MD = resolve(process.cwd(), 'AGENTS.md');

/** The heading the table sits under, which is how the table is found. */
const TABLE_HEADING = '## Mandatory rules — the complete list';

/**
 * GitHub's heading slugger, which is what an `AGENTS.md` anchor has to agree with to resolve:
 * lower-case, drop everything that is not a letter, a digit, a space, a hyphen or an underscore,
 * then hyphenate the spaces. That is what turns `` `test_sprites/` `` into `test_sprites` and
 * `1.0.0` into `100` — both live in the table.
 */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{Zs}\-_]/gu, '')
    .replace(/\p{Zs}/gu, '-');
}

/**
 * The `##` headings of a document, ignoring anything inside a fenced code block — both files
 * quote markdown at the reader, and a quoted heading is not a section.
 */
function sectionHeadings(markdown: string): string[] {
  const headings: string[] = [];
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && line.startsWith('## ')) headings.push(line.slice(3).trim());
  }
  return headings;
}

const claudeSections = sectionHeadings(readFileSync(CLAUDE_MD, 'utf8'));
const agentsText = readFileSync(AGENTS_MD, 'utf8');
const agentsSections = sectionHeadings(agentsText);

/** One parsed row of the table: what it calls the rule, and where it says the rule is. */
interface RuleRow {
  readonly rule: string;
  readonly where: string;
  readonly anchors: readonly string[];
}

/**
 * The rows of the table under {@link TABLE_HEADING}, read from that heading to the next `##` one
 * so a second table added lower down the page is not swept in. Rows are taken positionally rather
 * than by a table parser: two columns, and the `| --- | --- |` separator discarded.
 */
function ruleRows(markdown: string): RuleRow[] {
  const lines = markdown.split('\n');
  const start = lines.indexOf(TABLE_HEADING);
  if (start < 0) return [];

  const rows: RuleRow[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1);
    const rule = cells[0]?.trim() ?? '';
    const where = cells[1]?.trim() ?? '';
    if (/^-+$/.test(rule)) continue; // the `| --- | --- |` separator
    rows.push({ rule, where, anchors: [...where.matchAll(/CLAUDE\.md#([\w-]+)/g)].map((m) => m[1] ?? '') });
  }
  return rows;
}

const rows = ruleRows(agentsText);

describe('AGENTS.md rule table', () => {
  it('finds both halves to compare', () => {
    // Guards the suite itself: a renamed heading or a reformatted table would otherwise make every
    // assertion below vacuous, and the drift this exists to catch would resume silently.
    expect(claudeSections.length).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('has a row for every section of CLAUDE.md', () => {
    const linked = new Set(rows.flatMap((row) => row.anchors));
    const missing = claudeSections.filter((heading) => !linked.has(slug(heading)));
    expect(
      missing,
      'these CLAUDE.md sections have no row in the AGENTS.md table, which calls itself the complete list',
    ).toEqual([]);
  });

  it('links no section that CLAUDE.md does not have', () => {
    const known = new Set(claudeSections.map(slug));
    const stale = rows.flatMap((row) => row.anchors).filter((anchor) => !known.has(anchor));
    expect(stale, 'these rows link a CLAUDE.md anchor that resolves to nothing').toEqual([]);
  });

  it('gives each section exactly one row', () => {
    const counts = new Map<string, number>();
    for (const anchor of rows.flatMap((row) => row.anchors)) {
      counts.set(anchor, (counts.get(anchor) ?? 0) + 1);
    }
    const duplicated = [...counts].filter(([, count]) => count > 1).map(([anchor]) => anchor);
    expect(duplicated, 'these CLAUDE.md sections are claimed by more than one row').toEqual([]);
  });

  it('only says "below" where the page really carries the rule', () => {
    // A row's emoji is its pointer to the section on this page. One naming a section that has been
    // removed sends a reader looking for a rule that is no longer there.
    const orphaned = rows
      .filter((row) => row.where.includes('below'))
      .map((row) => ({ rule: row.rule, emoji: row.where.split(' ')[0] ?? '' }))
      .filter(({ emoji }) => !agentsSections.some((heading) => heading.startsWith(emoji)));
    expect(orphaned, 'these rows point at a section this page does not have').toEqual([]);
  });
});
