import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design-token contract.
 *
 * Tailwind generates a utility for every `--color-*` / `--font-*` / `--animate-*` in the
 * `@theme` block, and components reference those utilities by name. The failure mode this
 * suite exists for is that **an unknown Tailwind utility emits no CSS and raises no error** —
 * so renaming or dropping a token doesn't break the build, it silently un-styles every call
 * site that used it, and the app just renders wrong.
 *
 * Nothing else in the toolchain catches that. These names are quoted in CLAUDE.md's
 * design-token table as the vocabulary components must use, so changing one is a deliberate
 * act that should fail here first and be updated in both places together.
 *
 * The stylesheet is read from disk rather than imported: Vitest runs with `css: false`, which
 * stubs CSS modules out entirely — including `?raw` — so an import would assert against an
 * empty string and pass for the wrong reason. That is also why this file lives under `tests/`
 * (the Node-side program) rather than beside the app source.
 *
 * Resolved from `process.cwd()`, which Vitest sets to the project root, rather than from
 * `import.meta.url` — Vitest rewrites module URLs, so they are not `file:` URLs `readFileSync`
 * can take.
 */
const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Every token CLAUDE.md's design-token table promises a component can reach for. */
const REQUIRED_THEME_TOKENS = [
  // The foundry surface ramp.
  '--color-foundry-950',
  '--color-foundry-900',
  '--color-foundry-800',
  '--color-foundry-700',
  '--color-foundry-600',
  // Accents: indigo primary, cyan live state, then the three semantic ones.
  '--color-accent',
  '--color-accent-strong',
  '--color-accent-soft',
  '--color-neon',
  '--color-neon-deep',
  '--color-gold',
  '--color-emerald',
  '--color-rose',
  // Text tones.
  '--color-ink',
  '--color-ink-muted',
  '--color-ink-faint',
  // Type.
  '--font-sans',
  '--font-mono',
  // Motion.
  '--animate-fade-in',
  '--animate-pulse-glow',
  '--animate-float-orb',
  '--animate-float-orb-slow',
  '--animate-shimmer',
  '--animate-tooltip-in',
  '--animate-aurora',
  '--animate-scan-beam',
  '--ease-emphasized',
];

/** Bespoke utilities components use by name, declared with `@utility` rather than `@theme`. */
const REQUIRED_UTILITIES = ['bg-grid-pattern', 'bg-aurora', 'glass-panel', 'glass-float', 'shimmer-surface'];

/** An `--animate-*` token names a keyframe; if that keyframe is missing the animation is a no-op. */
const ANIMATION_KEYFRAMES = [
  'fade-in',
  'pulse-glow',
  'float-orb',
  'shimmer',
  'tooltip-in',
  'aurora',
  'scan-beam',
];

/**
 * The two glass surfaces are glass *because* of `backdrop-filter`. Strip it and both still render
 * — as flat translucent panels — which is the silent-failure shape this whole suite exists for:
 * the layout is unchanged, nothing errors, and the design has quietly reverted.
 */
const GLASS_UTILITIES = ['glass-panel', 'glass-float'];

describe('design tokens', () => {
  it.each(REQUIRED_THEME_TOKENS)('declares %s', (token) => {
    expect(stylesheet).toContain(`${token}:`);
  });

  it.each(REQUIRED_UTILITIES)('declares the @utility %s', (utility) => {
    expect(stylesheet).toContain(`@utility ${utility}`);
  });

  it.each(ANIMATION_KEYFRAMES)('defines the @keyframes %s its --animate token references', (name) => {
    expect(stylesheet).toContain(`@keyframes ${name}`);
    expect(stylesheet).toContain(`--animate-${name}: ${name} `);
  });

  it.each(GLASS_UTILITIES)('blurs what is behind %s, prefixed for Safari as well', (utility) => {
    const declaration = stylesheet.slice(stylesheet.indexOf(`@utility ${utility} {`));
    const body = declaration.slice(0, declaration.indexOf('\n}'));

    // Anchored to the start of a line, not a bare `toContain`. `-webkit-backdrop-filter: blur(`
    // *ends* with the unprefixed spelling, so a substring check for the standard property is
    // satisfied by the prefixed one alone — and would keep passing after the only declaration
    // every non-Safari engine reads had been deleted.
    expect(body).toMatch(/^\s*backdrop-filter: blur\(/m);
    expect(body).toMatch(/^\s*-webkit-backdrop-filter: blur\(/m);
  });

  it('pins the colour scheme to dark, because there is no light palette to fall back to', () => {
    expect(stylesheet).toContain('color-scheme: dark');
  });

  it('neutralises motion for users who asked their OS for less of it', () => {
    // The single catch-all in index.css is what makes every future animation reduced-motion
    // safe without each call site remembering. Losing it is silent for most users and
    // actively unpleasant for the ones it exists to protect.
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stylesheet).toContain('animation-duration: 0.01ms !important');
  });
});
