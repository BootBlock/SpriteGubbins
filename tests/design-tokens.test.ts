import { readdirSync, readFileSync } from 'node:fs';
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
  const keyframe = ruleBlock('@keyframes spectrum-pan {', '@keyframes ');

  /** Every `var(--color-spectrum-…) NN%` in `bg-spectrum`'s gradient, in the order written. */
  const stops = [...spectrum.matchAll(/var\(--color-spectrum-(\w+)\) ([\d.]+)%/g)].map((stop) => ({
    name: stop[1],
    at: Number(stop[2]),
  }));

  /** The width `bg-spectrum` sizes its gradient to, as a percentage of the element. */
  const width = Number(/background-size: ([\d.]+)% [\d.]+%;/.exec(spectrum)?.[1]);

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
function luminanceOf([L, C, hDeg]: [number, number, number]): number {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, blue] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(Math.max(v, 0), 1)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * blue;
}

/** WCAG contrast between two tokens, by name. */
function contrastBetween(one: string, other: string): number {
  const a = luminanceOf(oklchToken(one));
  const b = luminanceOf(oklchToken(other));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

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
