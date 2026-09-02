import { describe, expect, it } from 'vitest';
import {
  deadUtilities,
  emittedClassNames,
  PROSE_COLLISIONS,
  spelledIn,
  staleCollisions,
} from '../scripts/deadUtilities.ts';

/**
 * The guard that stops prose shipping CSS, driven on the half Vitest can reach.
 *
 * The check itself runs at build time — a `closeBundle` hook, because that is the one place the
 * emitted stylesheet and the app's own markup are both in hand — and Vitest never builds, so the
 * assertion cannot be exercised end to end from here. That is the same constraint
 * `precache-contract.test.ts` states for its own contract. What *can* be exercised, and what these
 * tests cover, is the reading: which selectors count as emitted, and what counts as a source
 * spelling one.
 *
 * **Every fixture class name below is deliberately not a utility.** Tailwind reads `tests/` as
 * markup, so a fixture naming a real one would emit a rule for it and this file would become the
 * next thing the build fails on — which is precisely the failure it is written to describe.
 */

/** A stylesheet fixture in the shape the build actually writes: minified, no whitespace. */
function sheet(...rules: string[]): string {
  return rules.join('');
}

describe('emittedClassNames', () => {
  it('reads the class a rule is written for', () => {
    expect(emittedClassNames(sheet('.zq-alpha{color:red}'))).toStrictEqual(['zq-alpha']);
  });

  it('reads a class nested inside a media query', () => {
    // The condition this was got wrong under. Built CSS is minified, so cutting a prelude back to
    // the last `}` alone leaves the inner rule reading as part of the `@media` line — and every
    // class inside every media query in the sheet drops out of the guard's view in silence.
    expect(
      emittedClassNames(sheet('.zq-alpha{color:red}@media (min-width:80rem){.zq-beta{color:red}}')),
    ).toStrictEqual(['zq-alpha', 'zq-beta']);
  });

  it('undoes the escaping a selector needs, so a name reads as a className would write it', () => {
    expect(emittedClassNames(sheet(String.raw`.zq-alpha\/60{color:red}`))).toStrictEqual(['zq-alpha/60']);
    expect(emittedClassNames(sheet(String.raw`.zx\:zq-alpha{color:red}`))).toStrictEqual(['zx:zq-alpha']);
  });

  it('does not read the decimal of a media condition as a class', () => {
    // `(min-width:71.5rem)` carries a full stop followed by an identifier character, which is a
    // class selector to anything matching on shape alone. Two things rule it out — the prelude
    // opens with an at-rule, and a class may not begin with an unescaped digit — and the second is
    // what still holds inside a condition the first does not cover.
    expect(emittedClassNames(sheet('@media (min-width:71.5rem){.zq-alpha{color:red}}'))).toStrictEqual([
      'zq-alpha',
    ]);
  });

  it('does not read a comment as a rule', () => {
    // Every build of this stylesheet opens with Tailwind's own banner, and that banner names a
    // domain. Left in, its `.com` is reported as a class the app has never worn.
    expect(
      emittedClassNames(sheet('/*! example v1 | https://example.test */.zq-alpha{color:red}')),
    ).toStrictEqual(['zq-alpha']);
  });

  it('reads every class of a compound or descendant selector', () => {
    expect(emittedClassNames(sheet('.zq-alpha .zq-beta:hover>.zq-gamma{color:red}'))).toStrictEqual([
      'zq-alpha',
      'zq-beta',
      'zq-gamma',
    ]);
  });
});

describe('spelledIn', () => {
  it('will not answer for a longer name that merely starts the same way', () => {
    // The whole reason the match is bounded. A numeric step is a prefix of the next step up, so a
    // plain substring search reports a class as used by the one nobody meant.
    expect(spelledIn('zq-alpha-1', 'className="zq-alpha-10"')).toBe(false);
    expect(spelledIn('zq-alpha-1', 'className="zq-alpha-1 zq-beta"')).toBe(true);
  });

  it('will not answer for a name that is only part of a variant', () => {
    expect(spelledIn('zq-alpha', 'className="zx:zq-alpha"')).toBe(false);
  });

  it('answers for a name carrying characters a pattern would otherwise read', () => {
    expect(spelledIn('zq-alpha/60', 'className="zq-alpha/60"')).toBe(true);
    expect(spelledIn('zq-alpha/60', 'className="zq-alphaX60"')).toBe(false);
  });
});

describe('deadUtilities', () => {
  const css = sheet('.zq-alpha{color:red}.zq-beta{color:red}');

  it('reports a class the markup never asks for', () => {
    expect(deadUtilities(css, ['className="zq-alpha"'])).toStrictEqual(['zq-beta']);
  });

  it('reports nothing when every class is worn', () => {
    expect(deadUtilities(css, ['className="zq-alpha zq-beta"'])).toStrictEqual([]);
  });

  it('takes a spelling from any one source, not from all of them', () => {
    expect(deadUtilities(css, ['className="zq-alpha"', 'className="zq-beta"'])).toStrictEqual([]);
  });

  it('says nothing about a name the collision list exempts', () => {
    const [exempt] = PROSE_COLLISIONS;
    if (exempt === undefined) throw new Error('PROSE_COLLISIONS is empty');
    expect(deadUtilities(sheet(`.${exempt}{color:red}`), [])).toStrictEqual([]);
  });
});

describe('staleCollisions', () => {
  it('reports an exemption the app has since made redundant', () => {
    const [exempt] = PROSE_COLLISIONS;
    if (exempt === undefined) throw new Error('PROSE_COLLISIONS is empty');
    expect(staleCollisions([`className="${exempt}"`])).toStrictEqual([exempt]);
  });

  it('reports nothing while every exemption is still covering something', () => {
    expect(staleCollisions(['className="zq-alpha"'])).toStrictEqual([]);
  });
});

describe('PROSE_COLLISIONS', () => {
  it('names each word once', () => {
    expect([...new Set(PROSE_COLLISIONS)]).toHaveLength(PROSE_COLLISIONS.length);
  });

  it('is kept in a reading order, so a seventh entry lands where it can be found', () => {
    expect([...PROSE_COLLISIONS]).toStrictEqual([...PROSE_COLLISIONS].sort());
  });
});
