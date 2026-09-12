import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The size `CLAUDE.md` may reach, and the proof that `AGENTS.md` is still only a pointer to it.
 *
 * Every agent session loads `CLAUDE.md` whole before it reads the task, so each sentence in it is
 * paid for by every change, including all the changes it has nothing to say about. Rules were added
 * one lesson at a time, each with its rationale and the incident that found it, until the file was
 * 137 KB. A compaction took it to 16 KB, and within the day its review put more than a kilobyte back:
 * rules the cut had wrongly dropped, restored into the file rather than into notes. Nothing measured
 * the size, so nothing asked where they belonged.
 *
 * So the caps are numbers this suite holds. A rule that applies to one kind of change is a durable
 * memory note, and `CLAUDE.md` names the note in one row of its table. When this fails, move detail
 * out or shorten a rule that is already there. A cap is raised only by the maintainer's decision,
 * never to make a change pass. The section cap stops the file staying under its total by letting one
 * section grow while the others are cut.
 */
const CLAUDE_MD_CHARACTERS = 8_000;
const SECTION_CHARACTERS = 1_250;

/** Room for a heading and two sentences, which is all a pointer needs. */
const AGENTS_MD_CHARACTERS = 400;

const HOW_TO_FIX =
  'Move detail that applies to one kind of change into a memory note named from the table, or ' +
  'shorten a rule. Do not raise the cap without asking the maintainer.';

/** A file's text with LF endings, so an editor that writes CRLF into the tree cannot move a count. */
function textOf(path: string): string {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

const claude = textOf('CLAUDE.md');
const agents = textOf('AGENTS.md');

/** The opening lines and each `## ` section, heading included. */
const sections = claude.split(/^(?=## )/mu);

describe('agent instruction files', () => {
  it('keeps CLAUDE.md within its cap', () => {
    expect(
      claude.length,
      `CLAUDE.md is ${String(claude.length)} characters. ${HOW_TO_FIX}`,
    ).toBeLessThanOrEqual(CLAUDE_MD_CHARACTERS);
  });

  it('keeps every section of CLAUDE.md within its cap', () => {
    // A heading form the split failed to recognise would pass the whole file as one section.
    expect(sections.length).toBeGreaterThan(5);

    const over = sections
      .filter((section) => section.length > SECTION_CHARACTERS)
      .map((section) => `${section.split('\n', 1)[0] ?? ''} (${String(section.length)})`);

    expect(over, HOW_TO_FIX).toStrictEqual([]);
  });

  it('states in CLAUDE.md the caps this suite holds', () => {
    // An agent reads the numbers in CLAUDE.md, not here, so the two must agree.
    const format = new Intl.NumberFormat('en-GB');
    for (const cap of [CLAUDE_MD_CHARACTERS, SECTION_CHARACTERS, AGENTS_MD_CHARACTERS]) {
      expect(claude).toContain(format.format(cap));
    }
  });

  it('keeps AGENTS.md a pointer to CLAUDE.md rather than a copy of its rules', () => {
    expect(agents).toContain('](CLAUDE.md)');
    expect(agents, 'AGENTS.md has sections of its own: put the rule in CLAUDE.md').not.toMatch(/^## /mu);
    expect(agents.length).toBeLessThanOrEqual(AGENTS_MD_CHARACTERS);
  });
});
