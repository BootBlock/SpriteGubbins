import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve, sep } from 'node:path';
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
  // The scrollbar's own three, which exist because no tone on the ramp clears 3:1 against the track.
  '--color-scrollbar-track',
  '--color-scrollbar-thumb',
  '--color-scrollbar-thumb-hover',
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
  // Type: the two families, and the three rungs of the scale below the heading sizes.
  '--font-sans',
  '--font-mono',
  '--text-2xs',
  '--text-xs',
  '--text-sm',
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
  'bg-checkerboard',
  'bg-spectrum',
  'glass-panel',
  'glass-float',
  'action-tab',
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

/**
 * The type scale below the headings: the rung, and the pixel size it has to render at.
 *
 * Three rungs, 2px apart, and that spacing is the contract rather than a coincidence. What this
 * replaced was three sizes 1px apart — 10, 11 and 12 — of which only 12 had a name at all, the
 * other two being written as arbitrary bracketed values at 39 call sites. That is a band rather
 * than a hierarchy: nothing told a new component which of them to take, and the tooltip's guidance
 * paragraph ended up smaller than the label it explains.
 *
 * A rung nudged to an adjacent value still renders, and renders plausibly, so nothing else in the
 * toolchain would notice the ladder collapsing back into that band.
 */
const TYPE_SCALE = [
  ['--text-2xs', 11],
  ['--text-xs', 13],
  ['--text-sm', 15],
] as const;

/**
 * Every source file under `src/` that can carry a Tailwind class name.
 *
 * Deliberately not just `.tsx`. A class string does not have to sit in JSX to reach the bundle —
 * Tailwind reads whatever its content scan reads, so a `.ts` module hoisting a shared `className`
 * constant (this repo already has three) counts, and so does `index.css` itself, where a class
 * written even inside a comment is a candidate the build emits. Scanning components alone would
 * leave the one place a size could hide from the guard: `src/constants/`, which is exactly where
 * CLAUDE.md's directory rule sends a hoisted constant.
 */
function scannableSources(): string[] {
  const root = resolve(process.cwd(), 'src');
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(tsx?|css)$/.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

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

  it('reaches the two pseudo-elements the universal selector does not', () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(stylesheet)?.[1] ?? '';

    // `*` matches neither `::backdrop` (no parent to descend from) nor `::details-content`, so each
    // has to be named or its motion escapes the catch-all entirely — a modal's backdrop fading and
    // `section-reveal`'s height transition are the two that would.
    expect(block).toMatch(/::backdrop/);
    expect(block).toMatch(/\*::details-content \{[^}]*transition-duration: 0\.01ms !important/);
  });

  it('keeps ::details-content out of the main catch-all selector list', () => {
    // An unknown pseudo-element invalidates the whole selector list it appears in, not just its own
    // compound. Folded into the `*, *::before, *::after, ::backdrop` list, it would take the entire
    // catch-all down on every engine that has not shipped `::details-content` — turning a
    // reduced-motion guarantee off for the users it exists to protect, silently.
    const universalList = /\n {2}\*,\n([\s\S]*?)\{/.exec(stylesheet)?.[0] ?? '';

    expect(universalList).not.toBe('');
    expect(universalList).not.toContain('details-content');
  });

  it('gates the section reveal on the lift that keeps its clip safe', () => {
    // The height transition clips `::details-content`, and a clipping ancestor around the studio's
    // fields would slice `ComboBox`'s suggestion list in half. That is safe only because
    // `useAnchoredSurface` lifts the list into the top layer, and only where `showPopover()` exists
    // — so the clip must not outlive the lift. Both halves are named in the same `@supports`.
    expect(stylesheet).toMatch(
      /@supports \(interpolate-size: allow-keywords\) and selector\(:popover-open\)/,
    );
    // Scoped to the declaration block, not the whole file: the paragraph above this rule *names*
    // `overflow-y: clip`, so a global match would be satisfied by the prose that explains the
    // declaration and would still pass with the declaration itself deleted.
    const closed = /\n {4}&::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    expect(closed).not.toBe('');
    // `hidden` would establish a scroll container; the inline axis stays `visible` so the global
    // focus ring, drawn 4px outside a full-width control, is not shaved off either edge.
    expect(closed).toContain('overflow-y: clip');
    expect(closed).toContain('overflow-x: visible');
    expect(closed).not.toContain('overflow: hidden');
  });

  it('transitions content-visibility on the open state only, so a shut group is never tabbable', () => {
    // The asymmetry is load-bearing, and it looks like an oversight — which is exactly why it is
    // pinned. `content-visibility … allow-discrete` in the *closed* rule is what animates the
    // collapse, and it does so by keeping `::details-content` painted past the moment `open` goes:
    // measured in Edge, Enter-then-Tab then lands on a control inside a group that is already shut,
    // and `<body>` gets the focus 200ms later. `SectionToggleAll` exists to stop that happening.
    const closed = /\n {4}&::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';
    const open = /\n {4}&\[open\]::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    expect(closed).not.toBe('');
    expect(open).not.toBe('');
    expect(closed).not.toContain('content-visibility');
    expect(open).toContain('content-visibility 200ms allow-discrete');
  });

  it.each(TYPE_SCALE)('sizes %s at the rung it names, and gives it a line height', (token, pixels) => {
    const size = new RegExp(`${token}: ([\\d.]+)rem;`).exec(stylesheet)?.[1];

    // `rem` against the 16px root, because that is what the rung is chosen in — a value edited to
    // a bare `px` would defeat a reader's OS text-size preference and this check would go quiet.
    expect(size).toBeDefined();
    expect(Number(size) * 16).toBe(pixels);

    // Overriding a size without its companion leaves Tailwind's leading for the *stock* size
    // underneath it. Those are unitless ratios, not lengths, so the leading does not stay put as
    // the size moves — it scales with it, landing at whatever the old rung's ratio implies rather
    // than at a chosen value. It renders, and renders plausibly, which is why this is asserted.
    expect(stylesheet).toContain(`${token}--line-height:`);
  });

  it('keeps the rungs 2px apart, and all of them under the heading sizes', () => {
    // 1px between two rungs is not a hierarchy, it is the drift this scale replaced: three sizes
    // that read as one blurry band, so which one a component took was arbitrary. `--text-base`
    // and up are Tailwind's own and deliberately not redefined, so the top rung has to stay below
    // 16px or the lede and the bold headings it introduces would collide.
    const sizes = TYPE_SCALE.map(([token]) => {
      const value = new RegExp(`${token}: ([\\d.]+)rem;`).exec(stylesheet)?.[1];
      return Number(value) * 16;
    });

    // The gap check subsumes an ordering check — a rung out of order yields a negative difference,
    // never `[2, 2]` — so asserting the sort separately would be a line no breakage can reach.
    expect(sizes.slice(1).map((size, index) => size - (sizes[index] ?? 0))).toStrictEqual([2, 2]);
    expect(Math.max(...sizes)).toBeLessThan(16);
  });

  it('leaves nothing under src/ setting its own font size outside the scale', () => {
    // The failure this suite exists for, in its type form: Tailwind happily compiles a bracketed
    // arbitrary size, so a component that wants something smaller than the ladder offers just
    // takes it, silently, and the scale stops describing the app. Thirty-nine call sites had done
    // exactly that — including the guidance card the scale was eventually rebuilt around.
    //
    // The pattern is assembled from parts rather than written out whole: this file is inside
    // Tailwind's content scan, and a complete arbitrary utility spelled here would be a candidate
    // the build emits — the same trap the `@source not` rules above exist for.
    const arbitrarySize = new RegExp(String.raw`text-` + String.raw`\[[\d.]+(px|rem|em)\]`);
    const files = scannableSources();

    // A `scannableSources()` that returned nothing — a moved directory, a changed `cwd` — would
    // make the filter below trivially empty and this whole guard pass while scanning no code at
    // all. `src/` holds 200-odd files, so this floor is nowhere near the real count.
    expect(files.length).toBeGreaterThan(20);

    const offenders = files.filter((file) => arbitrarySize.test(readFileSync(file, 'utf8')));

    expect(offenders).toStrictEqual([]);
  });
});

/**
 * The `@utility bg-spectrum` body, and the `@keyframes spectrum-pan` block, isolated.
 *
 * Both are bounded by the *next* at-rule of their own kind rather than by a closing brace at a
 * guessed indentation: the keyframe nests two frames inside itself and sits inside `@theme`, so a
 * search for the first `}` lands in the wrong place either way. A window that overshoots would only
 * ever let a later declaration answer a question about this one, and every assertion below reads a
 * value that appears exactly once in its window.
 */
function ruleBlock(opener: string, kind: string): string {
  const start = stylesheet.indexOf(opener);
  if (start === -1) throw new Error(`${opener} is not in the stylesheet`);
  const rest = stylesheet.slice(start + opener.length);
  const next = rest.indexOf(kind);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('the wheel turns without a seam', () => {
  const spectrum = ruleBlock('@utility bg-spectrum {', '@utility ');
  const wordmark = ruleBlock('@utility heading-spectrum {', '@utility ');
  const keyframe = ruleBlock('@keyframes spectrum-pan {', '@keyframes ');

  /**
   * The wheel image itself, taken from the one declaration both utilities compose.
   *
   * A CSS declaration ends at the first `;` outside brackets, and a gradient carries none, so the
   * value is everything up to it.
   */
  const wheel = /--spectrum-wheel:([^;]+);/.exec(stylesheet)?.[1] ?? '';

  /** Every `var(--color-spectrum-…) NN%` in that gradient, in the order written. */
  const stops = [...wheel.matchAll(/var\(--color-spectrum-(\w+)\) ([\d.]+)%/g)].map((stop) => ({
    name: stop[1],
    at: Number(stop[2]),
  }));

  /** The width `bg-spectrum` sizes the wheel to, as a percentage of the element. */
  const width = Number(/background-size: ([\d.]+)% [\d.]+%;/.exec(spectrum)?.[1]);

  it('is one image both spectrum surfaces reach for, never two copies of the stop list', () => {
    // `heading-spectrum` used to `@apply bg-spectrum`, which made sharing automatic. It cannot any
    // more — it composes the wheel under a veil, so it writes its own `background-image` — and the
    // failure that opens up is a second stop list drifting from the first: ten colours in one
    // place and eleven in the other renders perfectly and looks like nothing in a diff.
    expect(wheel).toContain('linear-gradient');
    expect(spectrum).toContain('background-image: var(--spectrum-wheel);');
    expect(wordmark).toContain('var(--spectrum-wheel)');
    expect(wordmark).not.toMatch(/var\(--color-spectrum-\w+\) [\d.]+%/);
  });

  it('sizes both spectrum surfaces alike, because one keyframe drives them both', () => {
    // `animate-spectrum-pan` is written once and lands on the hairline and the wordmark alike, and
    // its end position is only correct for the size it was derived against. Let the two sizes drift
    // and the seam comes back on whichever surface lost — silently, since both still animate.
    const wordmarkWidth = Number(/background-size: ([\d.]+)% [\d.]+%;/.exec(wordmark)?.[1]);

    // The floor first, because `toBe` is `Object.is` and `Object.is(NaN, NaN)` is `true`: if both
    // rules lost their `background-size` the equality alone would call that agreement.
    expect(wordmarkWidth).toBeGreaterThan(100);
    expect(wordmarkWidth).toBe(width);
  });

  it("keeps the wordmark behind a veil, so the app's name is not the loudest thing on a page", () => {
    // The wheel neat through 20px of bold type put ten saturated hues in the corner the eye lands
    // on first, cycling. Losing the veil is a one-line edit that renders beautifully and undoes the
    // whole point, so the layer is asserted rather than left to a comment — and asserted *in
    // order*, because a background layer listed after the wheel is painted behind it.
    expect(wordmark).toMatch(
      /background-image:[\s\S]*color-mix\(in oklab, var\(--color-ink\) \d+%[\s\S]*var\(--spectrum-wheel\)/,
    );

    // The veil has to be an image layer. `background-color` is painted under every image, so the
    // same colour written that way would sit behind the wheel and show through nothing.
    expect(wordmark).not.toMatch(/^\s*background-color:/m);
  });

  it('travels exactly one image width per turn, so the loop closes where it opened', () => {
    // The bug this replaced: a `background-position` percentage resolves against *(positioning
    // area − image size)*, not against the image, so `100%` on a `200%`-wide gradient moved it a
    // single element width — half the image. The wheel restarted five stops round from where it
    // ended and the chrome's hairline flicked from cyan back to rose every 32 seconds. Nothing
    // else notices: the animation runs, the colours are right, the discontinuity is one frame.
    //
    // Asserted as *travel*, and deliberately not as `to === width`. Those two agree at `200%` and
    // at no other size, so the equality would be a coincidence dressed as a derivation: a gradient
    // sized `S%` of its box moves `P/100 × (S − 100)/S` of its own width as the position runs to
    // `P%`, which puts the seamless end at `150%` for a `300%` image — where `300%` would close
    // cleanly but turn the wheel *twice* a cycle, and the token calls 32s one turn. `toBeCloseTo`
    // because a size whose end position is a repeating decimal has to be written rounded, while
    // every way of getting this wrong is at least half a turn out.
    const from = Number(/from \{\s*background-position: ([\d.]+)% /.exec(keyframe)?.[1]);
    const to = Number(/to \{\s*background-position: ([\d.]+)% /.exec(keyframe)?.[1]);
    const turns = ((to - from) / 100) * ((width - 100) / width);

    // Before the travel, because it is what makes the range non-zero — and because `Object.is`
    // says NaN is NaN, so a failed parse would otherwise satisfy an equality rather than break it.
    expect(width).toBeGreaterThan(100);
    expect(from).toBe(0);
    expect(turns).toBeCloseTo(1, 4);
  });

  it('closes the wheel on the colour it opened with, because the image tiles', () => {
    // `background-repeat` is left at `repeat`, so the gradient's last stop sits against its first
    // at every tile boundary. Drop the repeated stop and magenta butts straight against rose — a
    // hard edge sliding across the page once per turn, which the check above cannot see.
    expect(stops.length).toBe(SPECTRUM_STOPS.length + 1);
    expect(stops.at(0)?.name).toBe(stops.at(-1)?.name);
    expect(stops.at(0)?.at).toBe(0);
    expect(stops.at(-1)?.at).toBe(100);
  });

  it('lays the whole wheel out in the order the constant turns it', () => {
    // A stop dropped from the gradient still renders — as a wider band of its neighbour — and one
    // transposed still renders as a spectrum. Neither is visible in a diff of a colour list.
    expect(stops.slice(0, -1).map((stop) => stop.name)).toStrictEqual(SPECTRUM_STOPS);
  });

  it('spaces the stops evenly, since the wheel they name is evenly spaced', () => {
    // The palette's claim is ten hues 36° apart; a gradient that crowds them is a picture of a
    // different wheel. Derived from the count so an eleventh stop needs no edit here.
    const pitch = 100 / SPECTRUM_STOPS.length;

    // Both sides of the comparison come from `stops`, so a parse that matched nothing would
    // compare `[]` with `[]` and pass having read no CSS at all. The length is the guard.
    expect(stops.length).toBe(SPECTRUM_STOPS.length + 1);
    expect(stops.map((stop) => stop.at)).toStrictEqual(stops.map((_, index) => index * pitch));
  });
});

/**
 * Reading a colour token back out of the stylesheet, in the space it is written in.
 *
 * Parsed rather than hard-coded so the assertions below measure *the palette*, not a copy of it
 * that would go on passing after someone changed the real thing.
 */
function oklchToken(name: string): [number, number, number] {
  const declaration = new RegExp(name + String.raw`: oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)`).exec(stylesheet);
  if (declaration === null) throw new Error(`${name} is not declared as an oklch() triple`);
  return [Number(declaration[1]), Number(declaration[2]), Number(declaration[3])];
}

/**
 * OKLCH to linear sRGB, then WCAG's relative luminance — which *is* linear sRGB, since the standard's
 * channel formula is the inverse of the sRGB transfer function this conversion stops short of.
 *
 * Clamped to the gamut the way a browser clamps, which matters not at all for these near-neutral
 * tones and would matter a great deal for a saturated one.
 */
function linearOf([L, C, hDeg]: [number, number, number]): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(Math.max(v, 0), 1)) as [number, number, number];
}

/** WCAG relative luminance of an already-resolved linear-sRGB triple. */
function luminanceOf([r, g, b]: [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast between two linear-sRGB triples — the one place the ratio is written down. */
function contrastOf(one: [number, number, number], other: [number, number, number]): number {
  const [a, b] = [luminanceOf(one), luminanceOf(other)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The same ratio between two tokens, by name. */
function contrastBetween(one: string, other: string): number {
  return contrastOf(linearOf(oklchToken(one)), linearOf(oklchToken(other)));
}

/**
 * The sRGB transfer function and its inverse.
 *
 * Needed only for the alpha compositing below: CSS blends a translucent fill with what is behind it
 * in **gamma-encoded** sRGB, not in the linear space WCAG measures luminance in. Averaging the
 * linear values instead — the shortcut that looks equivalent — makes every composite come out
 * lighter than the browser paints it, which for a check that exists to find a *too light* fill would
 * quietly report the failure as a pass.
 */
const encode = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const decode = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/**
 * A token laid over another at `alpha`, the way the engine composites it, as linear sRGB.
 *
 * Destructured into three channels rather than mapped over an array, which is what keeps the return
 * a *tuple*: `Array.prototype.map` widens to `number[]`, and under `noUncheckedIndexedAccess` every
 * consumer of that would have to admit a possibly-missing channel it can see there are three of.
 */
function compositeOf(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): [number, number, number] {
  const [fr, fg_, fb] = linearOf(fg);
  const [br, bg_, bb] = linearOf(bg);
  const mix = (over: number, under: number) => decode(alpha * encode(over) + (1 - alpha) * encode(under));
  return [mix(fr, br), mix(fg_, bg_), mix(fb, bb)];
}

describe("a view's primary action", () => {
  const block = ruleBlock('@utility action-tab {', '@utility ');

  /**
   * Every background the utility paints, in every state — the value only, property name dropped.
   *
   * Read as a *complete list* rather than searched for the one shape the sweep understands, because
   * the two are not the same guard and only this one is total. A regex that hunts for
   * `background-color: color-mix(in oklab, var(--color-tab) N%…)` finds the fill as it happens to be
   * written today and is blind to every other way of painting the same surface — `background-color:
   * var(--color-tab)` at full strength, a different `color-mix` colour space, the arguments the other
   * way round, the `background` shorthand, a `background-image` of two identical stops. Those are not
   * exotic spellings; the first is the most natural way anyone would write "hover fills with the
   * view's colour", and `text-ink` on an unmixed stop measures 1.62:1. Enumerating instead means a
   * background this file cannot measure fails the check below rather than slipping past it.
   *
   * Anchored per line and requiring a `property: value;` shape, so the utility's own prose — which
   * begins every line with ` * ` — cannot match.
   */
  const backgrounds = [...block.matchAll(/^\s*background[\w-]*: ([^;]+);/gm)].map((rule) => rule[1] ?? '');

  /** The one shape the contrast sweep can measure: a `--color-tab` fill at a stated alpha. */
  const TAB_FILL = /^color-mix\(in oklab, var\(--color-tab\) ([\d.]+)%, transparent\)$/;

  /** The one background here that carries no view colour at all — the disabled state's flat tone. */
  const COLOURLESS_FILL = 'var(--color-foundry-700)';

  const fillAlphas = backgrounds
    .map((value) => TAB_FILL.exec(value)?.[1])
    .filter((alpha) => alpha !== undefined)
    .map(Number);

  /** The two mix percentages the recipe is: the resting fill, then the border. */
  const fillAlpha = fillAlphas[0];
  const borderAlpha = Number(
    /border: 1px solid color-mix\(in oklab, var\(--color-tab\) ([\d.]+)%/.exec(block)?.[1],
  );

  /**
   * Every panel one of these buttons actually sits on. `foundry-800` is the lightest — `glass-panel`
   * is that tone at 72% over the page, so it never resolves lighter — and it is therefore the case
   * the text contrast has to survive; `foundry-950` is the well the preset save row sits in.
   */
  const PANELS = ['--color-foundry-800', '--color-foundry-900', '--color-foundry-950'];

  it('mixes the fill and the border at the two strengths the recipe is', () => {
    // Pinned because the pair is the design and the gap between them is the whole point: the fill is
    // a tint at 30% and the border is a boundary at 80%, and only the border clears the ratio that
    // makes the control locatable. Nudging the fill toward the border — which looks like a tidy-up,
    // since a 30% surface reads as barely there — is what this exists to stop.
    expect(fillAlpha).toBe(30);
    expect(borderAlpha).toBe(80);
  });

  it('paints no background the contrast sweep below cannot measure', () => {
    // The half that makes the sweep total, and the reason it is a separate assertion: a fill written
    // in a shape `TAB_FILL` does not recognise would otherwise be *silently* excluded from the
    // contrast check — the loops would simply not visit it, and the suite would stay green while the
    // button went under AA. So every background is required to be either a `--color-tab` mix this
    // file can compute or the one colourless tone the disabled state uses; a third kind fails here,
    // and the fix is to teach the sweep about it rather than to widen this list.
    expect(backgrounds.length).toBeGreaterThanOrEqual(2);
    expect(backgrounds.filter((value) => !TAB_FILL.test(value) && value !== COLOURLESS_FILL)).toStrictEqual(
      [],
    );
  });

  it('keeps text-ink above 4.5:1 on every fill it paints, at every stop and on every panel', () => {
    // The stops are all L 0.76, so a composite lightens as the alpha rises and the ink on it darkens
    // by comparison — 51% is the last value that still clears AA, and 52% does not. That ceiling,
    // not the resting 30%, is the real rule, so this sweeps *every* fill the utility paints rather
    // than the resting one alone: a hover or active state that later re-lights the surface is held
    // to the same floor. The assertion above is what makes "every" true rather than "every one the
    // regex happened to match".
    const ink = linearOf(oklchToken('--color-ink'));

    // Without this a parse that found nothing would make the loops below run zero assertions and
    // the whole guard would pass having measured no colour at all.
    expect(fillAlphas.length).toBeGreaterThan(0);

    for (const alpha of fillAlphas) {
      for (const stop of SPECTRUM_STOPS) {
        for (const panel of PANELS) {
          const fill = compositeOf(oklchToken(`--color-spectrum-${stop}`), oklchToken(panel), alpha / 100);
          expect(contrastOf(fill, ink)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('carries the button edge on the border, which at this fill is the whole of it', () => {
    // WCAG 1.4.11 wants 3:1 between a control and its surroundings, and the 30% fill contributes
    // nothing towards it: over a panel it lands between 1.68:1 and 1.89:1, so *no* stop on *any*
    // panel comes near. A borderless version of this button would have no locatable edge at all —
    // which makes the border a correctness property rather than a flourish, and the reason the
    // fill's reduction stopped at the fill and left the border where it was.
    for (const stop of SPECTRUM_STOPS) {
      for (const panel of PANELS) {
        const surface = oklchToken(panel);
        const border = compositeOf(oklchToken(`--color-spectrum-${stop}`), surface, borderAlpha / 100);
        expect(contrastOf(border, linearOf(surface))).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('says hover on the border and the bloom, which is what the button is read by', () => {
    // Deliberately *not* "the hover sets no `background-color`". That was the assertion while the
    // fill sat at its contrast ceiling and there was no headroom to raise it into; at 30% there is,
    // so pinning the absence would be pinning an accident — a hover fill is now allowed, provided it
    // clears AA, which the two assertions above enforce between them. What belongs here is the
    // positive half: the hover has to change the border, because the border is the only part of this
    // button carrying its edge, and a hover that moved the fill alone would say nothing.
    const hover = /&:hover:not\(:disabled\) \{([^}]*)\}/.exec(block)?.[1] ?? '';

    expect(hover).toMatch(/border-color: var\(--color-tab\)/);
    expect(hover).toMatch(/box-shadow: .*var\(--color-tab\)/);
  });

  it('falls off the wheel entirely when disabled, so unavailable never reads as coloured', () => {
    const disabled = /&:disabled \{([^}]*)\}/.exec(block)?.[1] ?? '';

    expect(disabled).toMatch(/background-color: var\(--color-foundry-700\)/);
    expect(disabled).toMatch(/color: var\(--color-ink-faint\)/);
    // The bloom is the one hover declaration with nothing to override it here — `box-shadow: none`
    // is what stops a disabled control keeping the lit edge of the state before it.
    expect(disabled).toMatch(/box-shadow: none/);
  });

  it('leaves no button inside a view still painting itself the chrome primary', () => {
    // The defect this replaced: one indigo button treatment worn by every primary in the app, so
    // the page's colour identity stopped at the panel edge — and on a preset card, whose whole
    // point is that it owns a stop on the wheel, the single control ignored it.
    //
    // "Inside a view" is not the same as "in a view directory", and scoping this to the three view
    // directories alone would have left the hole that `SegmentedChoice` and `FilePickerField` sit
    // in: both live in `common/` and both render only ever inside a tab, so reverting either would
    // have gone unnoticed by the guard named for catching exactly that.
    //
    // `common/` cannot simply be added, because it also holds `Toast` and `Modal`, which belong to
    // no view and keep the primary on purpose. So a shared component is judged by *who imports it*
    // — it counts as being inside a view when every file that imports it is. That is derived rather
    // than listed, so a shared component later pulled into the chrome stops being checked here
    // without anyone remembering to remove it.
    const sources = scannableSources();
    const inView = (file: string) =>
      ['tabs', 'studio', 'quantise'].some((view) => file.includes(`components${sep}${view}${sep}`));

    const sharedInView = sources
      .filter((file) => file.includes(`components${sep}common${sep}`) && !file.endsWith('.test.tsx'))
      .filter((file) => {
        const importPath = new RegExp(`from '[^']*${basename(file, '.tsx')}\\.tsx'`);
        const importers = sources.filter(
          (other) => other !== file && importPath.test(readFileSync(other, 'utf8')),
        );
        // The `length` guard matters: without it a component nobody imports would pass `every`
        // vacuously and be swept in on the strength of having no callers at all.
        return importers.length > 0 && importers.every(inView);
      });

    const scoped = [...sources.filter(inView), ...sharedInView];

    // A filter that matched nothing — a directory renamed, a `sep` that is not the platform's —
    // would make the sweep below trivially empty and this guard pass having read no component at
    // all, which is the same failure shape the type-scale sweep above guards its own count against.
    // The second floor is what keeps the *derived* half honest, since it is the half that can go
    // quietly empty while the first stays green.
    expect(scoped.length).toBeGreaterThan(20);
    expect(sharedInView.length).toBeGreaterThanOrEqual(2);

    const offenders = scoped.filter((file) => /(bg|from|to)-accent-strong/.test(readFileSync(file, 'utf8')));

    expect(offenders).toStrictEqual([]);
  });
});

describe('scrollbar contrast', () => {
  /**
   * WCAG 1.4.11 wants 3:1 between a control and what it sits on. The scrollbar had been failing it
   * in both states — 1.19:1 resting, 1.36:1 hovered — with a thumb nobody could see, and the
   * obvious repair does not work: the whole foundry ramp tops out at L 0.286 and the ratio needs
   * L ≥ 0.482, so it takes tokens outside the ramp rather than a shade further along it.
   */
  it('clears 3:1 for the resting thumb, which is the state a scrollbar is in', () => {
    expect(contrastBetween('--color-scrollbar-thumb', '--color-scrollbar-track')).toBeGreaterThanOrEqual(3);
  });

  it('clears 3:1 hovered too, because both states failed and only fixing one is half a fix', () => {
    expect(
      contrastBetween('--color-scrollbar-thumb-hover', '--color-scrollbar-track'),
    ).toBeGreaterThanOrEqual(3);
  });

  it('keeps the two thumb states apart from each other, not merely from the track', () => {
    // A hover that clears the track by a mile and is indistinguishable from the resting thumb has
    // answered the ratio and lost the affordance.
    const [rest] = oklchToken('--color-scrollbar-thumb');
    const [hover] = oklchToken('--color-scrollbar-thumb-hover');
    expect(hover - rest).toBeGreaterThanOrEqual(0.05);
  });

  it('stays visible on every surface a scroll container actually sits on', () => {
    // The track is painted under the thumb, but the *surrounding* surface is what the eye compares
    // the whole scrollbar against — and in this app that is a well, the page, or a panel.
    for (const surface of ['--color-foundry-950', '--color-foundry-900', '--color-foundry-800']) {
      expect(contrastBetween('--color-scrollbar-thumb', surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('drives both engines from the tokens, since they share no declaration', () => {
    // Firefox reads `scrollbar-color`; Chromium reads the `::-webkit-scrollbar-*` rules. Fixing one
    // and not the other is a fix that works in half the browsers, which is the bug this replaced.
    expect(stylesheet).toMatch(
      /scrollbar-color: var\(--color-scrollbar-thumb\) var\(--color-scrollbar-track\)/,
    );
    expect(stylesheet).toMatch(/::-webkit-scrollbar-thumb \{[^}]*background: var\(--color-scrollbar-thumb\)/);
    expect(stylesheet).toMatch(
      /::-webkit-scrollbar-thumb:hover \{[^}]*background: var\(--color-scrollbar-thumb-hover\)/,
    );
    expect(stylesheet).toMatch(/::-webkit-scrollbar-track \{[^}]*background: var\(--color-scrollbar-track\)/);
  });
});

describe('forced colours and the sticky header', () => {
  it('re-expresses the colour-only signals in system colours', () => {
    const block = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(stylesheet)?.[1] ?? '';

    expect(block).not.toBe('');
    // The four things this app says with colour and no words: the focus ring, a drag under way,
    // which of a set of controls is current, and which row the combo box's arrow keys are on.
    expect(block).toMatch(/outline-color: Highlight/);
    expect(block).toMatch(/border-color: Highlight/);
    expect(block).toMatch(/background-color: Highlight/);
    expect(block).toMatch(/color: HighlightText/);
    expect(block).toMatch(/\[data-active='true'\]/);
  });

  it('marks the live drag with an outline, which does not take part in layout', () => {
    const block = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(stylesheet)?.[1] ?? '';

    // `PanViewport` keeps the same 1px border in both states and only changes its colour, so
    // thickening it here would shrink the content box by 2px at the moment the drag starts — moving
    // the image under the pointer, in the one mode this block exists to serve.
    expect(block).toMatch(/\.border-neon \{[^}]*outline: 2px solid Highlight/);
    expect(block).not.toMatch(/\.border-neon \{[^}]*border-width/);
  });

  it('never opts an element out of the forced palette instead of adapting to it', () => {
    // `forced-color-adjust: none` restores the author's colour by leaving the mode the user turned
    // on, which is the cheap fix the block above exists instead of. Comments are stripped first
    // rather than the match being narrowed to a line ending in a semicolon: that shape misses both
    // `none !important` and a single-line rule, which are the two spellings someone reaching for
    // this would actually write.
    const declarations = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');

    expect(declarations).not.toMatch(/forced-color-adjust:\s*none\b/);
  });

  it('holds the sticky header open at the top of a scroll, from a measured height', () => {
    // A number here would be a magic value, and worse, wrong at more than one width: the header
    // wraps. `Header` publishes its own height, which is the one figure that cannot drift.
    expect(stylesheet).toMatch(/scroll-padding-top: var\(--header-height, 0px\)/);
  });
});
