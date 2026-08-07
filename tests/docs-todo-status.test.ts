import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the plan-doc status convention defined in `docs/todo/README.md`.
 *
 * A finished plan reads exactly like a live one unless it says so, which is how stale guidance
 * gets picked up and followed months later. The banner is the fix, and a rule nothing checks is
 * a rule that drifts — so this suite is what makes it real.
 *
 * What it cannot do is judge whether a `✅ COMPLETE` banner is *true*. It checks that every
 * document declares a status, that the status is one of the four, and that the document sits in
 * the folder that status belongs in.
 */
const TODO_DIR = resolve(process.cwd(), 'docs/todo');
const DONE_DIR = join(TODO_DIR, 'done');

/** Which folder each status belongs in — the second half of the convention. */
const STATUS_HOME = {
  '🟢 ACTIVE': 'todo',
  '📘 REFERENCE': 'todo',
  '✅ COMPLETE': 'done',
  '⛔ SUPERSEDED': 'done',
} as const;

type Status = keyof typeof STATUS_HOME;

/** Narrows a captured banner string to a known status, so nothing here needs a cast. */
function isStatus(value: string): value is Status {
  return Object.hasOwn(STATUS_HOME, value);
}

/** `> **Status:** <emoji NAME> — <summary>` on its own line. */
const BANNER = /^>\s*\*\*Status:\*\*\s*(\S+\s+[A-Z]+)\s*—\s*\S/mu;

interface PlanDoc {
  readonly name: string;
  readonly location: 'todo' | 'done';
  readonly text: string;
}

function markdownIn(dir: string, location: 'todo' | 'done'): PlanDoc[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // `done/` need not exist until the first effort finishes.
    return [];
  }
  return entries
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .map((name) => ({ name, location, text: readFileSync(join(dir, name), 'utf8') }));
}

const docs = [...markdownIn(TODO_DIR, 'todo'), ...markdownIn(DONE_DIR, 'done')];

describe('docs/todo status banners', () => {
  it('finds the plan documents to check', () => {
    // Guards the suite itself: a wrong path or a changed layout would otherwise make every
    // assertion below vacuous, and the convention would silently stop being enforced.
    expect(docs.length).toBeGreaterThan(0);
  });

  it.each(docs.map((doc) => [`${doc.location}/${doc.name}`, doc] as const))(
    '%s declares a recognised status and sits in the right folder',
    (_label, doc) => {
      const match = BANNER.exec(doc.text);
      expect(match, `${doc.name} has no "> **Status:** …" banner — see docs/todo/README.md`).not.toBeNull();

      const status = match?.[1];
      expect(status, `${doc.name} has a malformed status banner`).toBeDefined();
      expect(Object.keys(STATUS_HOME), `${doc.name} uses an unrecognised status`).toContain(status);

      // The two assertions above have already failed the test if this doesn't hold; the guard
      // is what narrows `string | undefined` to a `Status` without asserting it.
      if (status === undefined || !isStatus(status)) return;
      expect(
        doc.location,
        `${doc.name} is ${status}, which belongs in docs/todo/${STATUS_HOME[status]}/`,
      ).toBe(STATUS_HOME[status]);
    },
  );

  it('carries the banner within the opening few lines, where a reader will see it', () => {
    for (const doc of docs) {
      const bannerLine = doc.text
        .split('\n')
        .findIndex((line) => line.trimStart().startsWith('> **Status:**'));
      expect(bannerLine, `${doc.name} has no status banner`).toBeGreaterThanOrEqual(0);
      expect(bannerLine, `${doc.name} buries its status banner too far down`).toBeLessThan(6);
    }
  });
});
