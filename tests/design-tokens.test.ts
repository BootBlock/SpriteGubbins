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

/**
 * The stops of the hue wheel, in the order they turn — **read from the module that names them**,
 * not restated here.
 *
 * The wheel exists twice by necessity: `src/index.css` defines the colours, and
 * `src/constants/spectrum.ts` names them so the preset library can allocate one per card. A third
 * copy written into this file would be the thing most likely to drift, and it would drift silently
 * in the direction that matters least — the test would keep passing while the two real copies
 * disagreed. Parsing the constant instead means a stop renamed in either place fails here.
 *
 * The failure it guards is invisible at runtime: `spectrumStopAt` builds
 * `var(--color-spectrum-<name>)`, and a name with no matching declaration resolves to nothing, so
 * `--color-tab` falls back to its registered `transparent` and the card loses its colour entirely.
 */
const spectrumModule = readFileSync(resolve(process.cwd(), 'src/constants/spectrum.ts'), 'utf8');
const spectrumDeclaration = /const SPECTRUM_STOPS = \[([^\]]+)\]/.exec(spectrumModule)?.[1] ?? '';
const SPECTRUM_STOPS = [...spectrumDeclaration.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);

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
  // The wheel, and the active view's position on it.
  ...SPECTRUM_STOPS.map((stop) => `--color-spectrum-${stop}`),
  '--color-tab',
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
  // The entrance layer, one per kind of thing that arrives, plus the two ambient/behavioural ones.
  '--animate-pop-in',
  '--animate-toast-in',
  '--animate-modal-in',
  '--animate-backdrop-in',
  '--animate-gradient-pan',
  '--animate-spectrum-pan',
  '--animate-toast-timer',
  '--ease-emphasized',
];

/** Bespoke utilities components use by name, declared with `@utility` rather than `@theme`. */
const REQUIRED_UTILITIES = [
  'bg-grid-pattern',
  'bg-aurora',
  'bg-spectrum',
  'glass-panel',
  'glass-float',
  'shimmer-surface',
  'heading-gradient',
  'heading-spectrum',
  'stagger-children',
];

/** An `--animate-*` token names a keyframe; if that keyframe is missing the animation is a no-op. */
const ANIMATION_KEYFRAMES = [
  'fade-in',
  'pulse-glow',
  'float-orb',
  'shimmer',
  'tooltip-in',
  'aurora',
  'scan-beam',
  'pop-in',
  'toast-in',
  'modal-in',
  'backdrop-in',
  'gradient-pan',
  'spectrum-pan',
  'toast-timer',
];

/**
 * The three properties the view colour is carried by, all of which must be *registered*.
 *
 * An unregistered custom property is an untyped token stream the engine cannot interpolate, so a
 * missing `@property` here does not break the page — it makes the view change snap instead of
 * sweeping, which is a regression nobody reports and nobody sees in a diff.
 */
const REGISTERED_PROPERTIES = ['--color-tab', '--tab-chord-a', '--tab-chord-b'];

/**
 * The two glass surfaces are glass *because* of `backdrop-filter`. Strip it and both still render
 * — as flat translucent panels — which is the silent-failure shape this whole suite exists for:
 * the layout is unchanged, nothing errors, and the design has quietly reverted.
 */
const GLASS_UTILITIES = ['glass-panel', 'glass-float'];

/**
 * The two utilities that paint their text `transparent` and rely on `background-clip` to fill the
 * glyphs. Losing the clip does not render a flat heading — it renders **no heading at all**, a
 * gradient filling the whole box behind invisible text.
 */
const CLIPPED_HEADINGS = ['heading-gradient', 'heading-spectrum'];

describe('design tokens', () => {
  it('parsed the wheel out of the constant it is checking against', () => {
    // Without this, a `SPECTRUM_STOPS` the regex above failed to find would be an empty array —
    // and an empty array turns every `it.each` over it into zero cases that all "pass". The whole
    // spectrum contract would go dark while the suite stayed green.
    expect(SPECTRUM_STOPS.length).toBeGreaterThanOrEqual(3);
    expect(SPECTRUM_STOPS).toContain('rose');
  });

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

  it.each(CLIPPED_HEADINGS)('clips %s to its glyphs, prefixed for Safari as well', (utility) => {
    // The same shape as the glass check above, with a worse failure — see CLIPPED_HEADINGS. Both
    // are checked because the second was added by copying the first, which is exactly the way the
    // prefixed spelling gets dropped from one of a pair.
    const declaration = stylesheet.slice(stylesheet.indexOf(`@utility ${utility} {`));
    const body = declaration.slice(0, declaration.indexOf('\n}'));

    expect(body).toMatch(/^\s*background-clip: text;/m);
    expect(body).toMatch(/^\s*-webkit-background-clip: text;/m);
  });

  it('pins the colour scheme to dark, because there is no light palette to fall back to', () => {
    expect(stylesheet).toContain('color-scheme: dark');
  });

  it.each(REGISTERED_PROPERTIES)('registers %s so the view change can be interpolated', (name) => {
    expect(stylesheet).toMatch(new RegExp(`@property ${name} \\{`));
  });

  it('declares the wheel in a static block, so no stop can be tree-shaken away', () => {
    // The stops are referenced only from *declaration values* — `--color-tab: var(--color-spectrum-…)`
    // — never from a class name. Tailwind emits a theme variable only when a generated utility uses
    // it, so a plain `@theme` would drop all ten from the output. `--color-tab` is registered as a
    // `<color>`, so the unresolvable `var()` would then fall back to its `transparent` initial value
    // and every surface wearing the view's colour would vanish. This is a one-word edit away.
    const block = stylesheet.slice(
      stylesheet.indexOf('@theme static {'),
      stylesheet.indexOf('\n}', stylesheet.indexOf('@theme static {')),
    );

    expect(stylesheet).toContain('@theme static {');
    for (const stop of SPECTRUM_STOPS) expect(block).toContain(`--color-spectrum-${stop}:`);
  });

  it('gives every stop the same lightness, because the wheel is a hue sweep and nothing else', () => {
    // The palette's whole claim is "one lightness, one role, ten hues" — that is what lets a stop
    // stand in for any other without re-checking contrast, and what makes the preset library read
    // as a spectrum rather than as ten unrelated colours. A stop quietly given its own lightness
    // still renders, so only this notices.
    const lightnesses = SPECTRUM_STOPS.map((stop) => {
      const declaration = new RegExp(`--color-spectrum-${stop}: oklch\\(([\\d.]+) `).exec(stylesheet);
      return declaration?.[1];
    });

    expect(lightnesses).toHaveLength(SPECTRUM_STOPS.length);
    expect(new Set(lightnesses)).toStrictEqual(new Set(['0.76']));
  });

  it('gives every view its own stop, and never the one reserved for the live state', () => {
    // A view added to `AppTab` without a rule here inherits studio's colour rather than getting its
    // own, which looks like a design decision instead of an omission. The union is read from disk
    // for the same reason the stylesheet is — `tests/` is the Node-side program and does not import
    // application modules.
    const types = readFileSync(resolve(process.cwd(), 'src/types/ui.ts'), 'utf8');
    const union = /export type AppTab =([^;]+);/.exec(types)?.[1] ?? '';
    const tabs = [...union.matchAll(/'([a-z-]+)'/g)].map((match) => match[1]);

    expect(tabs.length).toBeGreaterThan(0);

    const assigned = tabs.map((tab) => {
      const rule = new RegExp(`\\[data-tab='${tab}'\\] \\{\\s*--color-tab: var\\(--color-spectrum-(\\w+)\\)`);
      return rule.exec(stylesheet)?.[1];
    });

    // Every view resolved, all of them different, and none of them cyan — `neon` is the live-state
    // signal, and a view resting on it would make every panel look like it was recomputing.
    expect(assigned).not.toContain(undefined);
    expect(new Set(assigned).size).toBe(tabs.length);
    expect(assigned).not.toContain('cyan');
  });

  it('keeps documentation out of the content scan', () => {
    // Tailwind reads every non-ignored file as a potential template. The preserved original
    // application and CLAUDE.md's own design-token table — whose *"Not"* column names the stock
    // palette classes (`bg-slate-…`, `text-cyan-…`) — between them emitted 43 stock-palette
    // utilities no component references.
    //
    // The bytes are the small half. The real cost is that a component reaching for a stock slate
    // instead of `bg-foundry-800` would have rendered correctly, which defeats the one mechanism
    // that normally catches a non-token class: an unknown utility emits no CSS at all. Losing
    // either directive brings that back silently.
    //
    // The suffixes above are elided on purpose: a full class name written in this comment is
    // itself a candidate, and this file is scanned.
    expect(stylesheet).toContain('@source not "../docs/todo/sprite-gubbins.html"');
    expect(stylesheet).toContain('@source not "../**/*.md"');
  });

  it('neutralises motion for users who asked their OS for less of it', () => {
    // The single catch-all in index.css is what makes every future animation reduced-motion
    // safe without each call site remembering. Losing it is silent for most users and
    // actively unpleasant for the ones it exists to protect.
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stylesheet).toContain('animation-duration: 0.01ms !important');
  });
});
