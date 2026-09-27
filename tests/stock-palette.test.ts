import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { emittedClassNames, wornMarkup } from '../scripts/deadUtilities.ts';
import { compileStylesheet } from './compileStylesheet.ts';

/**
 * Tailwind's default palette renders nothing in this app, and the app spells none of it.
 *
 * CLAUDE.md bans a stock palette class, and for as long as the ban existed nothing enforced it:
 * `@import 'tailwindcss'` defines every stock hue, so a stock slate written where `bg-foundry-800`
 * belonged compiled to a working rule and rendered exactly as its author meant. The mechanism the
 * design-token suite leans on everywhere else — an unknown utility emits no CSS — never fired,
 * because a stock class was not unknown. `src/index.css` now clears the colour namespace before its
 * first token, which is what the first test pins.
 *
 * That turns a stock class into a typo, and a typo still passes the gate: it emits nothing, the
 * build's dead-utility guard only asks about rules that *were* emitted, and the element simply goes
 * unpainted. So the second test asks the question directly, and asks it of the compiler rather
 * than of a list of hue names kept here: the app's own markup, compiled once with the reset and once
 * without it. Every class that renders only in the second build is a class that reached for the
 * default palette, whichever utility it was written with.
 *
 * Every stock name below is assembled from parts. `tests/` is inside Tailwind's content scan, and a
 * whole class name written here would be a candidate the build reads.
 */
const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** The line that removes the default palette, which the second build leaves out. */
const RESET = '--color-*: initial;';

/** The stylesheet as it stood before the reset: every stock hue defined, beside every token. */
const unreset = stylesheet.replace(RESET, '');

/**
 * The classes `candidates` add to what `css` emits with none at all.
 *
 * `index.css` writes rules of its own that name a class — `@utility` bodies, and the selectors the
 * base layer paints — so a build given no candidates is not empty, and a probe's answer is the
 * difference from that.
 */
async function emittedFor(css: string, candidates: readonly string[]): Promise<string[]> {
  const own = new Set(emittedClassNames(await compileStylesheet(css, [])));
  return emittedClassNames(await compileStylesheet(css, candidates)).filter((name) => !own.has(name));
}

/** One class per shape a stock colour takes: a shaded hue, a hue behind an opacity, black, white. */
const STOCK_PROBES = [
  ['bg', 'slate-800'],
  ['text', 'cyan-400'],
  ['border', 'amber-300/40'],
  ['bg', 'black'],
  ['text', 'white'],
].map(([utility, colour]) => `${String(utility)}-${String(colour)}`);

/**
 * What a candidate may contain, for splitting markup into the words Tailwind would try.
 *
 * Narrower than Tailwind's own extractor, which also reads parentheses and commas inside an
 * arbitrary value. A stock colour class carries neither, so the words this split yields include
 * every one a stock class could be; what it cuts short is only ever an arbitrary value, and both
 * builds below read the same cut words.
 */
const CANDIDATE = /[\w\-:/.!#%[\]@]+/g;

/** Every word in the app's own markup, read as the dead-utility guard reads it. */
function markupWords(): string[] {
  const words = new Set<string>();
  for (const code of wornMarkup()) {
    for (const [word] of code.matchAll(CANDIDATE)) words.add(word);
  }
  return [...words];
}

describe('the stock palette', () => {
  it('renders nothing, however a stock colour is written', async () => {
    // The probes have to be classes that *would* render, or an empty answer proves nothing. Built
    // against the stylesheet without its reset, every one of them does.
    expect(stylesheet).toContain(RESET);
    expect(await emittedFor(unreset, STOCK_PROBES)).toStrictEqual([...STOCK_PROBES].sort());

    expect(await emittedFor(stylesheet, STOCK_PROBES)).toStrictEqual([]);
  });

  it('is spelled nowhere in the app’s own markup', async () => {
    const words = markupWords();
    const withTokens = new Set(emittedClassNames(await compileStylesheet(stylesheet, words)));
    const withStock = emittedClassNames(await compileStylesheet(unreset, words));

    // A split that found no classes, or a compile that emitted none, would leave the difference
    // below empty for the wrong reason. The app wears hundreds of utilities, and the foundry ramp's
    // panel rung is among them.
    expect(withTokens.size).toBeGreaterThan(200);
    expect(withTokens).toContain('bg-foundry-800');

    expect(withStock.filter((name) => !withTokens.has(name))).toStrictEqual([]);
  });
});
