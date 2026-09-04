import { readFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { codeOnly } from '../scripts/codeOnly.ts';
import { appMarkup, scannableSources, tailwindScanned } from '../scripts/sourceFiles.ts';
import { THEME_COLOR_PLACEHOLDER, themeColorHex } from '../scripts/themeColour.ts';
import { spectrumStopAt } from '../src/constants/spectrum.ts';

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
  '--animate-view-fade-in',
  '--animate-view-pop-in',
  '--animate-toast-in',
  '--animate-modal-in',
  '--animate-backdrop-in',
  '--animate-gradient-pan',
  '--animate-spectrum-pan',
  '--animate-toast-timer',
  '--animate-toast-out',
  '--ease-emphasized',
  '--ease-decelerate',
  '--ease-exit',
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
  'toast-out',
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

  it('names a defined keyframe from every --animate token, however the token is named', () => {
    // The check above is driven by the keyframe list, so it only reaches tokens named *after* their
    // keyframe — which most are. The view entrances are not: `--animate-view-fade-in` runs the
    // `fade-in` keyframe at the page-transition speed, so a typo in the name it references would
    // sail past a per-keyframe check and, because an unresolved animation name is not an error,
    // would show up only as a panel that had stopped animating. This reads the reference out of
    // each token instead.
    const tokens = [...stylesheet.matchAll(/^\s*--animate-[a-z-]+:\s*([a-z-]+)/gm)].map(
      ([, keyframe]) => keyframe,
    );

    // Guards the regex itself: a pattern that matched nothing would make every assertion below
    // vacuous, and this file's whole job is to fail when the stylesheet drifts.
    expect(tokens.length).toBeGreaterThanOrEqual(ANIMATION_KEYFRAMES.length);

    for (const keyframe of new Set(tokens)) {
      expect(stylesheet).toContain(`@keyframes ${keyframe}`);
    }
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

  it("lets the quantiser turn the floating glass opaque, its backdrop being the user's image", () => {
    // Every other view's backdrop is the app's own dark surfaces, so `glass-float` can be mostly
    // transparent and still be read through. The quantiser shows the user's sprite sheet at
    // whatever brightness they drew it, so it raises the alpha rather than the whole app giving up
    // the effect.
    //
    // What is asserted is the *structure* — that the mechanism is wired and that this view lands
    // above the default — and deliberately not a contrast threshold. There was an `>= 80` here
    // when the override cleared AA over pure white; the override is now 57%, which does not, and
    // lowering the bound to fit would have kept the shape of an accessibility guarantee while
    // asserting a number that no longer delivers one. The measurements live on the rule itself.
    //
    // Both halves are asserted because either alone is silent. A `glass-float` that stopped reading
    // the property would ignore the override and render the quantiser's guidance unreadable over a
    // light image; an override on a view that no longer sets it would leave the value dangling with
    // nothing to say so. Neither changes a layout or throws.
    const declaration = stylesheet.slice(stylesheet.indexOf('@utility glass-float {'));
    const body = declaration.slice(0, declaration.indexOf('\n}'));

    // Matched across newlines: Prettier wraps this declaration over four lines once the `var()`
    // makes it long enough, and a single-line pattern passed right up until `format` ran.
    expect(body).toMatch(
      /background-color:\s*color-mix\(\s*in oklab,\s*var\(--color-foundry-900\) var\(--glass-float-opacity, \d+%\),\s*transparent\s*\)/,
    );

    const quantise = /\[data-tab='quantise'\] \{([\s\S]*?)\n {2}\}/.exec(stylesheet)?.[1] ?? '';
    const override = /--glass-float-opacity: (\d+)%;/.exec(quantise)?.[1];
    const fallback = /var\(--glass-float-opacity, (\d+)%\)/.exec(body)?.[1];

    expect(Number(override)).toBeGreaterThan(Number(fallback));
  });

  // There was an alpha floor here, asserting that `glass-float` stayed opaque enough for body
  // guidance to clear 4.5:1 over the app's brightest surface. It is gone rather than lowered,
  // because the project no longer makes that promise: the floating glass is now deliberately
  // translucent enough to be seen through, which the comment on the utility measures and costs
  // out. A floor moved down to accommodate the new value would assert the same guarantee at a
  // number that does not deliver it, which is worse than no test — and the thing it was really
  // guarding, that the surface is glass at all, is the `backdrop-filter` check above.

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

  it('gives every view its own stop', () => {
    // A view added to `AppTab` without a rule here inherits studio's colour rather than getting its
    // own, which looks like a design decision instead of an omission. The list is read from disk
    // rather than imported for the same reason the stylesheet is: `APP_TABS` is what the module
    // *declares*, and a rule that stopped naming a tab has to fail here rather than resolve.
    //
    // Read from `APP_TABS`, the `as const` array, rather than from the `AppTab` type it derives:
    // the union became an array when the opening view started being persisted, since a stored tab
    // has to be validated against the list that *defines* the set. A regex over the type alias now
    // matches the alias and finds no identifiers in it, which is why the floor below is asserted —
    // an empty list would turn every check that follows into zero cases that all pass.
    const types = readFileSync(resolve(process.cwd(), 'src/types/ui.ts'), 'utf8');
    const declaration = /export const APP_TABS = \[([^\]]+)\]/.exec(types)?.[1] ?? '';
    const tabs = [...declaration.matchAll(/'([a-z-]+)'/g)].map((match) => match[1]);

    expect(tabs.length).toBeGreaterThan(0);

    const assigned = tabs.map((tab) => {
      const rule = new RegExp(`\\[data-tab='${tab}'\\] \\{\\s*--color-tab: var\\(--color-spectrum-(\\w+)\\)`);
      return rule.exec(stylesheet)?.[1];
    });

    // Every view resolved, and all of them different. Which stops they may *take* is the next test
    // down, because that rule reaches further than the view rules do.
    expect(assigned).not.toContain(undefined);
    expect(new Set(assigned).size).toBe(tabs.length);
  });

  it('never lets a `--color-tab` rest on the stop the palette reserves for the live state', () => {
    // `neon` is the live signal — auto-sync, generating, recomputing as you type — and the wheel's
    // nearest stop sits 10° from it, against the 26° `index.css` says it keeps every view clear of.
    // A surface resting there reads as mid-generation.
    //
    // The rule is written in `index.css` about the *custom property*, not about views, and for a
    // while it was enforced about views alone: the assertion above was built from the `[data-tab]`
    // rules, so it never reached `spectrumStopAt`, which handed one preset card in ten the reserved
    // stop. Ten shipped cards painted their edge, their hover bloom, their heading and their
    // `action-tab` load button in the live colour. So this sweeps **every** assignment of the
    // property the app makes, and the claim and the enforcement now cover the same set.
    //
    // Which stop is reserved is *found* rather than named. Writing the word here would put a third
    // hand-kept copy of it beside the module's and the palette's, and the two on this side would
    // move together and cancel: a wheel stop renamed would leave the allocator offering the live
    // hue under a new name, with the assertion comparing that name against itself. The hue is what
    // decides, so the nearest stop to `neon` is the reserved one however it is spelled.
    const hueOf = (token: string) =>
      Number(new RegExp(`${token}: oklch\\([\\d.]+ [\\d.]+ ([\\d.]+)\\)`).exec(stylesheet)?.[1]);
    const reference = (stop: string | undefined) => `var(--color-spectrum-${stop})`;

    const neonHue = hueOf('--color-neon');
    const separations = SPECTRUM_STOPS.map((stop) => {
      const apart = Math.abs(hueOf(`--color-spectrum-${stop}`) - neonHue);
      return { stop, degrees: Math.min(apart, 360 - apart) };
    });
    const reserved = separations.reduce((nearest, stop) => (stop.degrees < nearest.degrees ? stop : nearest));

    // Both floors first: an unparsed hue is `NaN`, which loses every comparison above and would
    // hand this the last stop on the wheel rather than the reserved one.
    expect(Number.isFinite(neonHue)).toBe(true);
    expect(separations.every((stop) => Number.isFinite(stop.degrees))).toBe(true);

    // And that there is a stop to reserve at all: the one the views hold 26° clear of is inside
    // that margin itself, which is what makes it the stop this rule is about.
    expect(reserved.degrees).toBeLessThan(26);

    // Every assignment the app makes, in the shapes it can take: a CSS declaration, an object key
    // in an inline `style`, and a `setProperty` call — which the app already uses for three other
    // custom properties, so it is the route a fourth would most likely arrive by.
    const assignments = appMarkup().flatMap((file) => {
      const source = codeOnly(readFileSync(file, 'utf8'));
      const written = [...source.matchAll(/--color-tab['"]?\s*:\s*([^;,}]+)/g)];
      const called = [...source.matchAll(/setProperty\(\s*['"]--color-tab['"]\s*,([^)]*\)?[^)]*)\)/g)];

      return [...written, ...called].map((match) => ({
        where: relative(process.cwd(), file),
        // A trailing `]` closes a Tailwind arbitrary property, and a quoted value is what both the
        // object key and the `setProperty` call carry. Neither belongs to the colour.
        value: (match[1] ?? '')
          .trim()
          .replace(/]$/, '')
          .replace(/^(['"])(.*)\1$/, '$2'),
      }));
    });

    // A floor, because a regex that matched nothing would find no offending stop either. Six today:
    // the `@theme` default, the four `[data-tab]` rules, and the allocator in `PresetCard`.
    expect(assignments.length).toBeGreaterThanOrEqual(6);

    for (const { where, value } of assignments) {
      const stop = /^var\(--color-spectrum-(\w+)\)$/.exec(value)?.[1];

      if (stop === undefined) {
        // Not a stop written on the page, so it has to be the allocator — whose pool is driven
        // below. Anything else is a route this test cannot see the colour of.
        expect(value, where).toMatch(/^spectrumStopAt\(/);
        continue;
      }

      expect(stop, where).not.toBe(reserved.stop);
    }

    // And the allocator itself, driven rather than parsed: it is the one assignment above whose
    // value this file cannot read off the page. One round of the pool, which is the wheel less the
    // stop it reserves.
    const round = (offset: number) =>
      Array.from({ length: SPECTRUM_STOPS.length - 1 }, (_, index) => spectrumStopAt(offset + index));
    const allocated = round(0);

    expect(allocated).not.toContain(reference(reserved.stop));
    expect(new Set(allocated).size).toBe(allocated.length);
    expect(new Set(allocated)).toStrictEqual(
      new Set(separations.filter((stop) => stop.stop !== reserved.stop).map((stop) => reference(stop.stop))),
    );

    // The wrap, compared round against round rather than as a set: an unplaceable index falls back
    // to the pool's own first stop, so a modulo that had gone missing would answer the whole second
    // round with that one value while the first round still offered every stop.
    expect(round(SPECTRUM_STOPS.length - 1)).toStrictEqual(allocated);

    // The fallback, which is the one branch no array index reaches. It has to stay inside the pool:
    // a reserved stop that moved to the wheel's first position would otherwise come back here.
    for (const index of [-1, 1.5, Number.NaN]) {
      expect(spectrumStopAt(index)).not.toBe(reference(reserved.stop));
    }
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

  it('gives the in-app switch the same quiet as the system preference, declaration for declaration', () => {
    // The settings dialog offers reduced motion for this app alone, which a media query cannot
    // express — so the declarations exist twice, and CSS offers no way to share them: a media query
    // and an attribute selector cannot be one condition, and driving both from script would leave
    // the guarantee off until JavaScript had run, on the first paint, for the users it protects.
    //
    // Duplication is therefore the chosen cost, and *drift* is what it buys a risk of: a fifth
    // declaration added to one block and not the other is invisible in a diff and produces an
    // in-app setting that quiets slightly less than the system one. This compares the sets rather
    // than listing them, so anything added to either has to be added to both.
    const media = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(stylesheet)?.[1] ?? '';
    const systemBlock = /\n {2}\*,\n[\s\S]*?\{([^}]*)\}/.exec(media)?.[1] ?? '';
    const inAppBlock = /\n\[data-motion='reduced'\],\n[\s\S]*?\{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    const declarations = (block: string) =>
      [...block.matchAll(/^\s*([\w-]+:[^;]+);/gm)].map((rule) => rule[1]).sort();

    // Both floors first: a regex that matched nothing would compare `[]` with `[]` and call two
    // empty results agreement, having read no CSS at all.
    expect(declarations(systemBlock).length).toBeGreaterThanOrEqual(4);
    expect(declarations(inAppBlock)).toStrictEqual(declarations(systemBlock));

    // `::details-content` is excluded from both selector lists — an unknown pseudo-element
    // invalidates the whole list it appears in — so it needs its own rule on each side too.
    expect(stylesheet).toMatch(
      /\[data-motion='reduced'\] \*::details-content \{[^}]*transition-duration: 0\.01ms !important/,
    );
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
    expect(stylesheet).toMatch(/@supports selector\(::details-content\) and selector\(:popover-open\)/);
    // Not `interpolate-size`. It is Chromium-only, and gating on it shipped a reveal that Firefox
    // skipped entirely — the caret turning was the only motion left, which is how the bug arrived.
    expect(stylesheet).not.toMatch(/@supports \(interpolate-size/);
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

  it('holds the content painted through the close, which is the only way it animates', () => {
    // `content-visibility … allow-discrete` on the *closed* rule is what gives the collapse a box to
    // shrink: the user agent hides `::details-content` the moment `open` goes, and without the
    // discrete transition deferring that there is nothing left to transition and the group snaps.
    // Losing this line is silent — the open still animates, so it reads as working.
    const closed = /\n {4}&::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    expect(closed).not.toBe('');
    expect(closed).toContain('content-visibility 585ms allow-discrete');
    expect(closed).toContain('block-size 585ms var(--ease-decelerate)');
  });

  it('animates to a measured pixel height rather than to a keyword', () => {
    // `block-size: 0 → auto` needs `interpolate-size`, which Firefox 153 does not support — gating
    // the rule on it is what left Firefox with no reveal at all and only the caret turning. A pixel
    // length needs no keyword interpolation, so both engines animate it; the number comes from
    // `CollapsibleSection`, which measures its own content.
    const open = /\n {4}&\[open\]::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';
    const closed = /\n {4}&::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    expect(open).not.toBe('');
    expect(open).toContain('block-size: var(--section-content-block-size, auto)');
    // Scoped to the declarations. The comment above them names `interpolate-size` while explaining
    // why it is not used, so a whole-file assertion would be satisfied by that prose — the exact
    // failure mode this suite exists to catch, arriving inside the suite itself.
    expect(open).not.toContain('interpolate-size');
    expect(closed).not.toContain('interpolate-size');
  });

  it('eases the size change on the curve whose travel is legible, not the entrance curve', () => {
    // `ease-emphasized` is 83% travelled in its first quarter, which is right for an entrance and
    // wrong for a height: the panel arrives before the eye catches it and the motion reads as
    // absent, leaving the caret the only thing that appears to move. That was the reported symptom.
    const closed = /\n {4}&::details-content \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';

    expect(closed).toContain('var(--ease-decelerate)');
    expect(closed).not.toContain('var(--ease-emphasized)');
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
 * The ladder every transition in the app stands on, slowest rung last.
 *
 * These are not six independently chosen speeds. They are the stock Tailwind figures a component
 * would otherwise have reached for, taken through the whole-layer passes `src/index.css` describes:
 * 150/200/300/500/700ms at 1.95× give 293 (rounded from 292.5), 390, 585, 975 and 1365, and the tab
 * pill's 1440 is the page-transition speed, which took 2.4× instead. Stating them here rather than
 * deriving them is deliberate — a derivation would have to encode which of the two multipliers each
 * rung took, and that choice *is* the rung.
 *
 * What the list catches is a seventh figure appearing: a `duration-` at the stock 200ms, the speed
 * Tailwind's documentation suggests, which is what `ImageDropZone`'s Clear button carried three
 * lines below a panel on 585. A number off this ladder is not a slightly wrong speed — it is a
 * control on a different clock from the surface around it.
 *
 * The utility is spelled in two halves for the reason the type scale's guard gives above: `tests/`
 * is inside Tailwind's content scan, so a complete class name written even in a comment here is a
 * candidate the build emits — and this file exists to stop that class reaching the bundle at all.
 */
const MOTION_RUNGS = [293, 390, 585, 975, 1365, 1440];

/**
 * The stylesheet with its comments blanked, for the assertions that ask whether a declaration exists.
 *
 * `toContain` against the raw file cannot tell a declaration from a sentence about one, and every
 * token in this file carries a paragraph. The two `--default-transition-*` lines below are the case
 * that forced it: thirty-odd lines of prose sit directly above them explaining what they are for, and
 * a reword that quoted either one verbatim would satisfy the assertion with the real declaration
 * gone. Blanking first means the only thing that can answer is the declaration itself.
 */
const declarations = codeOnly(stylesheet);

/**
 * The utility this ladder is about, assembled from two halves that are not a class name apart.
 *
 * Written whole, the pattern would be a candidate in its own right: this file is inside the content
 * scan it exists to protect, and the value half accepts `(` and `[`, so the source of the regex
 * matches itself and the guard reports its own line as an offender. Splitting it is the move the
 * type scale's guard makes one screen up, for the same reason.
 *
 * The value is bounded to the characters a Tailwind utility can carry, not to "anything before a
 * space". A closing brace or parenthesis is what a class abuts at the end of a template literal, and
 * swallowing one turns a rung into `NaN` and reports a call site that was correct. An asterisk is
 * what the prose in `index.css` writes when it means the family rather than a member.
 */
const UTILITY = new RegExp(String.raw`\bduration` + String.raw`-([\w.[\]()/-]+)`, 'g');

describe('the speed a transition runs at when its call site says nothing', () => {
  it("gives the layer its own default rather than leaving Tailwind's", () => {
    // The failure this replaced: `transition-colors` with no `duration-*` beside it resolves to
    // Tailwind's stock 150ms, which is 2.6× faster than the commonest figure in `src/`. 36 of the
    // app's 121 transition class strings were on it, across 21 files — whole surfaces, not stray
    // controls — and every one of them looked correct, because a class that says nothing cannot
    // look wrong.
    expect(declarations).toContain('--default-transition-duration: 390ms;');
    expect(declarations).toContain('--default-transition-timing-function: var(--ease-emphasized);');
  });

  it('defaults to the base rung, so a bare transition matches the controls beside it', () => {
    const declared = /--default-transition-duration: (\d+)ms;/.exec(declarations)?.[1];

    // Not merely *a* rung. 390 is the one 44 call sites wrote out by hand, so it is the figure a
    // control that says nothing has to land on for the default to be doing its job at all.
    expect(Number(declared)).toBe(MOTION_RUNGS[1]);
  });

  it('points the default at a curve this file defines, never at a bare cubic-bezier', () => {
    const easing = /--default-transition-timing-function: (.+);/.exec(declarations)?.[1] ?? '';
    const token = /^var\((--ease-[a-z-]+)\)$/.exec(easing)?.[1];

    // Exactly one call site in `src/` names a curve, so this declaration decides the easing of every
    // other transition in the app. A raw `cubic-bezier(...)` here would be the literal CLAUDE.md's
    // token table bans, written in the one place that reaches everything.
    expect(token).not.toBeUndefined();
    expect(declarations).toContain(`${String(token)}: cubic-bezier(`);
  });

  it('keeps a line in each reduced-motion block for the property the default now decides', () => {
    // The catch-alls are what quiet the default: it and a `duration-*` compile to the same
    // `transition-duration`, and only these declarations carry `!important`. The suite's existing
    // check compares the two blocks *with each other*, so it stays green if both lose the same line
    // — which is exactly the edit that would let the default through. This counts them instead.
    const quiets = declarations.match(/transition-duration: 0\.01ms !important;/g) ?? [];

    // Four: the two catch-alls, and the `::details-content` rule each one carries beside it.
    expect(quiets).toHaveLength(4);
  });

  it('turns the disclosure caret on the curve its own height turns on', () => {
    // The two halves are one gesture and `index.css` says so at the height's end. Before the layer
    // had a default the caret was on Tailwind's stock ease; a default of `ease-emphasized` would
    // hand it the curve that rule rejects by name — 83% travelled in its first quarter — so the
    // panel would ease while the chevron snapped. It has to state the curve, as the height does.
    //
    // The caret is that file's one template-literal class string, and the pattern anchors on the
    // template rather than on a size for the reason this whole suite exists: the anchor used to open
    // with a `size-` value, a backslash ends a Tailwind candidate, and so the escaped decimal point
    // put the half in front of it into the scanner's list. The build emitted a rule for a size
    // nothing wears, from the file written to keep dead classes out of the bundle. The count is
    // asserted because a second template literal in that component would silently change which
    // string is being read.
    const source = resolve(process.cwd(), 'src/components/common/CollapsibleSection.tsx');
    const templates = [...readFileSync(source, 'utf8').matchAll(/className=\{`[^`]*`\}/g)];
    expect(templates).toHaveLength(1);
    const classes = templates[0]?.[0] ?? '';

    expect(classes).toContain('duration-585');
    expect(classes).toContain('ease-decelerate');
  });

  it('leaves no class in anything Tailwind scans naming a speed off the ladder', () => {
    // The type scale's guard in its motion form, and it is the same failure twice over. Tailwind
    // compiles the stock 200ms happily, so a component that wants the speed the docs suggest just
    // takes it and the layer stops describing the app — and Tailwind's content scan does not care
    // whether a class it finds is code, so a whole class name written in a *comment* reaches the
    // bundle as dead CSS. A note recording the tab pill's retired speed did exactly that, and the
    // class it named was still being emitted long after the figure was corrected. So this reads the
    // **raw** source rather than blanking comments, and it reads `tests/` as well as `src/` because
    // the build does: both offences are the same offence, and the record stays honest by writing the
    // utility and its figure in two halves, as that note and this docblock now do.
    const files = tailwindScanned();
    expect(files.length).toBeGreaterThan(20);

    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          [...line.matchAll(UTILITY)]
            .filter((match) => !MOTION_RUNGS.includes(Number(match[1])))
            .map(() => `${relative(process.cwd(), file).split(sep).join('/')}:${String(index + 1)}`),
        ),
    );

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
    // a tint at 24% and the border is a boundary at 54%, and only the border clears the ratio that
    // makes the control locatable. The border is also the number with almost nowhere left to go:
    // 52.73% is the lowest alpha that still clears 3:1, so 54% is carrying about 1.3 points of
    // headroom and no more. A later trim of "just a few percent", which looks like nothing, is
    // therefore the edit that takes the button's only edge under the threshold. The check below
    // measures that rather than trusting this, but a value changed here should be a deliberate act.
    expect(fillAlpha).toBe(24);
    expect(borderAlpha).toBe(54);
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
    // not the resting 24%, is the real rule, so this sweeps *every* fill the utility paints rather
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
    // WCAG 1.4.11 wants 3:1 between a control and its surroundings, and the 24% fill contributes
    // nothing towards it: over a panel it lands between 1.45:1 and 1.63:1, so *no* stop on *any*
    // panel comes near. That leaves the border carrying the whole requirement by itself, and at 54%
    // it clears at 3.09:1 on its worst combination — a margin of 0.09, which is why this is asserted
    // at every stop on every panel rather than sampled. The threshold is crossed at 52.73%, and the
    // ratio falls away smoothly rather than off a cliff (52% is 2.95:1, 50% is 2.80:1), so nothing
    // about the rendering announces the moment the button stops meeting 1.4.11 — this does.
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
    // fill sat at its contrast ceiling and there was no headroom to raise it into; at 24% there is,
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

/**
 * The hues the settings dialog offers, read from the `as const` array that defines the union.
 *
 * Parsed rather than restated for the reason the wheel is: a hue offered in the dialog with no rule
 * in the stylesheet renders as whatever the previous selection left behind — the custom properties
 * simply do not change — which is a swatch that appears to do nothing, with no error anywhere.
 */
const settingsTypes = readFileSync(resolve(process.cwd(), 'src/types/settings.ts'), 'utf8');
const accentDeclaration = /export const ACCENT_HUES = \[([^\]]+)\]/.exec(settingsTypes)?.[1] ?? '';
const ACCENT_HUES = [...accentDeclaration.matchAll(/'([a-z]+)'/g)].map((match) => match[1] ?? '');

/** The three role tokens a `[data-accent]` rule has to repoint, in the order they are declared. */
const ACCENT_TOKENS = ['--color-accent', '--color-accent-strong', '--color-accent-soft'];

/** One hue's rule body, bounded by the two-space closing brace every rule in `@layer base` has. */
function accentRule(hue: string): string {
  const opener = `[data-accent='${hue}'] {`;
  const start = stylesheet.indexOf(opener);
  if (start === -1) return '';
  const rest = stylesheet.slice(start + opener.length);
  const end = rest.indexOf('\n  }');
  return end === -1 ? rest : rest.slice(0, end);
}

/** One `oklch()` triple out of a rule body. */
function accentToken(hue: string, token: string): [number, number, number] {
  const declaration = new RegExp(token + String.raw`: oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)`).exec(
    accentRule(hue),
  );
  if (declaration === null) throw new Error(`${token} is not declared for the ${hue} accent`);
  return [Number(declaration[1]), Number(declaration[2]), Number(declaration[3])];
}

/**
 * OKLCH to linear sRGB **without the clamp** `linearOf` applies.
 *
 * The clamp is what a browser does, and it is right for measuring what a user sees — which is why
 * every contrast check above uses it. It is exactly wrong for asking whether a colour is *inside*
 * the gamut, because clamping is the thing being detected: a chroma past the boundary comes back
 * from `linearOf` as a perfectly plausible colour that is not the one written down.
 */
function unclampedOf([L, C, hDeg]: [number, number, number]): [number, number, number] {
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
  ];
}

describe('the accent hue the user chose', () => {
  it('parsed the hue list out of the module it is checking against', () => {
    // Without this an `ACCENT_HUES` the regex failed to find would be an empty array, and every
    // `it.each` below would become zero cases that all pass — the whole contract dark, suite green.
    expect(ACCENT_HUES.length).toBeGreaterThanOrEqual(3);
    expect(ACCENT_HUES).toContain('indigo');
  });

  it.each(ACCENT_HUES)('gives %s a rule declaring all three role tokens', (hue) => {
    // A hue offered with no rule is not a rendering error — the properties keep the value they had,
    // so the swatch is painted in the *previous* selection's colour and pressing it changes nothing.
    for (const token of ACCENT_TOKENS) expect(accentRule(hue)).toContain(`${token}: oklch(`);
  });

  it('leaves the default exactly where it was, in both places it is written', () => {
    // The `@theme` block has to carry a concrete default or Tailwind generates no `accent` utilities
    // at all, so the default hue's values exist twice. They are not free to disagree: `@theme` is
    // what paints anything outside the shell, and the rule is what paints everything inside it.
    for (const token of ACCENT_TOKENS) {
      expect(oklchToken(token)).toStrictEqual(accentToken('indigo', token));
    }
  });

  it('never offers the stop reserved for the live state', () => {
    // `neon` is cyan and means "this is recomputing"; `pulse-glow` blooms from the accent to it
    // precisely to mark that transition. An accent resting on cyan collapses both ends of the signal
    // into one colour — the same reason no *view* owns that stop.
    const [, , cyanHue] = oklchToken('--color-spectrum-cyan');

    expect(ACCENT_HUES).not.toContain('cyan');
    for (const hue of ACCENT_HUES) {
      for (const token of ACCENT_TOKENS) expect(accentToken(hue, token)[2]).not.toBe(cyanHue);
    }
  });

  it('holds every hue to the default’s luminance, which is what makes the setting safe', () => {
    // The claim this whole feature rests on: **changing the accent cannot change a contrast ratio**.
    // It holds because luminance is held, not lightness — OKLCH lightness is perceptual and its
    // relationship to luminance depends on hue, so nine hues at one lightness would be nine
    // different ratios against every panel and against the near-black every coloured fill in this
    // app carries its label in. Gold at L 0.62 is far brighter than indigo at L 0.62, and
    // `text-foundry-950` sits on `accent-strong` in the app's loudest button.
    //
    // 1% of tolerance, against a derivation whose worst rounding error is 0.211%: wide enough that
    // three decimal places in the stylesheet are not a failure, narrow enough that a hue picked by
    // eye — which is how this would actually go wrong — cannot pass.
    for (const token of ACCENT_TOKENS) {
      const target = luminanceOf(linearOf(accentToken('indigo', token)));
      for (const hue of ACCENT_HUES) {
        const measured = luminanceOf(linearOf(accentToken(hue, token)));
        expect(Math.abs(measured - target) / target).toBeLessThan(0.01);
      }
    }
  });

  it('keeps every hue inside sRGB, so its chroma is the one written down', () => {
    // Each value is the same *fraction* of its own hue's gamut maximum as the default is of its, so
    // no hue is clamped and none is left undersaturated. A chroma nudged past the boundary still
    // renders — the engine clamps it — as a colour that is not what the declaration says, which
    // silently breaks the luminance match above at the same time.
    for (const hue of ACCENT_HUES) {
      for (const token of ACCENT_TOKENS) {
        for (const channel of unclampedOf(accentToken(hue, token))) {
          expect(channel).toBeGreaterThanOrEqual(-1e-6);
          expect(channel).toBeLessThanOrEqual(1 + 1e-6);
        }
      }
    }
  });

  it('never reaches the view’s own colour, which is not the user’s to set', () => {
    // The issue this feature answers asked for an accent that does *not* repaint the per-view
    // colours, and this is where that could quietly stop being true: a `--color-tab` added to one of
    // these rules would override the `[data-tab]` rule on the same element — same specificity, later
    // in the file — and every view would light up in the accent instead of its own stop. Nothing
    // would look broken; the app would simply stop saying which view you are in.
    for (const hue of ACCENT_HUES) {
      const rule = accentRule(hue);
      expect(rule).not.toContain('--color-tab');
      expect(rule).not.toContain('--tab-chord');
    }
  });
});

/**
 * The **unconditional** part of a `className` value, starting at `at`: a quoted attribute entire, or
 * a template literal's static chunks with every `${…}` blanked out.
 *
 * Which half of a class string is conditional decides whether a tone beside a ground is a defect or
 * a sibling. `SegmentedChoice` writes `` `… ${selected ? 'bg-tab text-foundry-950' : 'bg-foundry-700
 * text-ink-faint …'}` `` — the ink is the branch where the ground is *not* a role colour, and a scan
 * that read the two as one string would fail correct code. So the subtree sweep below keys on a
 * ground that is on the element **whatever the state**, and the literal sweep keys on one branch at
 * a time.
 */
function staticClasses(source: string, at: string | number): string {
  const cursor = Number(at) + 'className='.length;
  const opener = source[cursor];
  if (opener === '"' || opener === "'") {
    const end = source.indexOf(opener, cursor + 1);
    return end === -1 ? '' : source.slice(cursor + 1, end);
  }
  if (opener !== '{') return '';

  let depth = 0;
  let close = cursor;
  for (; close < source.length; close++) {
    if (source[close] === '{') depth++;
    else if (source[close] === '}' && --depth === 0) break;
  }

  const expression = source.slice(cursor + 1, close);
  const template = /^\s*`([\s\S]*)`\s*$/.exec(expression);
  // A bare conditional — `className={active ? … : …}` — has no unconditional text at all, so it
  // contributes nothing here and is left to the literal sweep.
  if (template === null) return '';
  return (template[1] ?? '').replace(/\$\{[\s\S]*?\}/g, ' ');
}

/**
 * The JSX subtree rooted at the element whose opening tag contains `index`, as source text.
 *
 * A ground is not usually the thing that carries the text. The eight accent buttons state their fill
 * and their label colour in one class string, so a same-string check finds them — and the toast does
 * not: its gradient is on the card, while the message, the dismiss ✕ and the countdown bar are three
 * separate children each choosing a tone of its own. That is the shape the reported defect had, so a
 * check that only reads the ground's own class string is a check that would have missed it.
 *
 * The opening tag ends at the first `>` outside a brace or a quote, which is what stops the `>` of an
 * `onClick={() => …}` being mistaken for it — twelve of the nineteen grounds in the app carry a
 * handler before their `className`, and reading the tag as ending there truncates the attributes and
 * lets the ground go unseen. The close is then found by counting nested `<Tag`/`</Tag>` pairs.
 */
function subtreeAt(source: string, index: string | number): string | null {
  const open = source.lastIndexOf('<', Number(index));
  const tag = /^<([A-Za-z][\w.]*)/.exec(source.slice(open, open + 40))?.[1];
  if (tag === undefined) return null;

  let cursor = open + 1;
  let braces = 0;
  let quote: string | null = null;
  for (; cursor < source.length; cursor++) {
    const character = source[cursor];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') quote = character;
    else if (character === '{') braces++;
    else if (character === '}') braces--;
    else if (character === '>' && braces === 0) break;
  }
  if (source[cursor - 1] === '/') return source.slice(open, cursor + 1);

  const opener = new RegExp(`<${tag}(?![\\w.])`, 'g');
  const closer = new RegExp(`</${tag}\\s*>`, 'g');
  let depth = 1;
  let scan = cursor + 1;
  while (depth > 0) {
    opener.lastIndex = scan;
    closer.lastIndex = scan;
    const nested = opener.exec(source);
    const close = closer.exec(source);
    // An unbalanced tag is a parse this file cannot complete, so it hands back the rest of the
    // module rather than a subtree whose end it has guessed: over-reading fails loudly, and stopping
    // early is what would let a tone hide past the point the scan gave up.
    if (close === null) return source.slice(open);
    if (nested !== null && nested.index < close.index) {
      depth++;
      scan = nested.index + 1;
    } else {
      depth--;
      scan = close.index + close[0].length;
    }
  }
  return source.slice(open, scan);
}

/**
 * Every tone on the ink ramp, faintest last — the tones a component reaches for by default.
 *
 * Module-scope because the two suites below both enumerate it, for opposite reasons: one measures
 * the ramp against the grounds it is *for*, the other bans it from the grounds it cannot sit on. A
 * copy in each is a fourth tone added to one of them.
 */
const INK_RAMP = ['--color-ink', '--color-ink-muted', '--color-ink-faint'];

/**
 * The ink ramp on the foundry ramp — the pairing that carries every word in the app.
 *
 * The tones are chosen against the *lightest* surface text ever sits on, and `index.css` says so at
 * the declaration. Nothing measured it. That is a gap of a particular kind: the figures were right,
 * they were only written down in prose, and prose is what a reader has to take on trust — which is
 * how a report arrived claiming `ink-muted` runs at 3.94:1 and `ink-faint` at 2.33:1 on the page,
 * against the 8.75:1 and 6.25:1 they actually measure. A wrong number in an issue costs a morning;
 * the same number believed would have lifted the whole ramp for nothing and flattened its three
 * rungs into two.
 *
 * So the sweep is total rather than illustrative: every tone against every surface, including the
 * pairings no component writes today, because what it guards is the *next* palette change and that
 * change does not know which pairings exist. `foundry-600` is the worst of them — a border or a
 * hover state, the lightest ground the ramp lands on — and `ink-faint` there is the tightest fit in
 * the app at 4.59:1.
 *
 * **The bar is 4.5:1 for all three, and the type scale is why.** WCAG 1.4.3 drops to 3:1 for large
 * text, which is 18.66px bold or 24px regular; this app's body rung is `text-xs` at 13px and its
 * floor is `text-2xs` at 11px, so nothing painted in these tones is ever large text. `ink-faint`
 * also dresses a disabled control, which 1.4.3 exempts — but it dresses a timestamp and a measured
 * dimension in the same breath, and a token cannot be exempt at one call site and not another.
 *
 * Translucent grounds are deliberately outside this. `glass-panel` and `glass-float` composite with
 * whatever is behind them, so their effective ground is not a ramp tone at all; what that costs, and
 * what the quantiser's raised `--glass-float-opacity` buys back, is measured at the utilities
 * themselves.
 */
describe('the ink ramp on the foundry ramp', () => {
  /** Every opaque surface the app paints under text, lightest last. */
  const SURFACES = [
    '--color-foundry-950',
    '--color-foundry-900',
    '--color-foundry-800',
    '--color-foundry-700',
    '--color-foundry-600',
  ];

  it('clears 4.5:1 at every tone on every surface', () => {
    for (const tone of INK_RAMP) {
      for (const surface of SURFACES) {
        expect([tone, surface, contrastBetween(tone, surface) >= 4.5]).toStrictEqual([tone, surface, true]);
      }
    }
  });

  it('stays a ramp — three tones a reader can tell apart, in order', () => {
    // The floor above is satisfiable by three tokens holding one value, which would pass every
    // assertion in this file and leave the app with a single text colour spelled three ways. Order
    // is half of it; separation is the other half. The two closest rungs are `ink-muted` and
    // `ink-faint`, which measure 8.75:1 and 6.25:1 on the page and so stand **1.40** apart; the
    // floor sits just under that, at 1.35, which is the whole of the margin. A re-tune is free to
    // move a rung within it and a ramp collapsing towards one tone is not.
    const onPage = INK_RAMP.map((tone) => contrastBetween(tone, '--color-foundry-900'));
    for (let index = 1; index < onPage.length; index++) {
      const brighter = onPage[index - 1] ?? 0;
      const dimmer = onPage[index] ?? 0;
      expect(dimmer).toBeLessThan(brighter);
      expect(brighter / dimmer).toBeGreaterThanOrEqual(1.35);
    }
  });
});

/**
 * A role colour used as a **ground** — the case the ink ramp cannot sit on.
 *
 * The defect this suite was written for: the toast paints its card `accent-strong → accent` and put
 * `text-ink-muted` on the dismiss ✕, which measures 1.14:1 at the accent end. It is not a dim glyph,
 * it is an absent one. Eight primary buttons had the same fill under `text-ink` at 3.07:1 and 2.04:1,
 * so the ✕ was the loud instance of a pattern rather than an isolated slip.
 *
 * The rule that replaced it is the one the wheel already states for `bg-tab`, and the measurement
 * below is what makes it general: across *every* solid role fill this app paints — the three accent
 * stops, `gold`, `rose`, `emerald`, the two `neon`s and all ten stops on the wheel — no tone on the
 * ink ramp reaches 4.5:1 (the best of them is 3.07:1) and `foundry-950` clears it everywhere (the
 * worst is 5.34:1). So the near-black is not a preference between two workable options; it is the
 * only half of the palette that can sit on a role colour at all.
 *
 * A *translucent* role fill is deliberately outside all of it. At the alphas the app uses the
 * composite is mostly panel, and `text-ink` on one measures between 5.9:1 and 10.4:1, so folding the
 * two cases together would ban a pairing that is correct.
 */
describe('a role colour used as a ground', () => {
  /** Every stop a solid role fill can be. The wheel is here because `bg-tab` resolves to one of it. */
  const GROUNDS = [
    '--color-accent',
    '--color-accent-strong',
    '--color-accent-soft',
    '--color-gold',
    '--color-rose',
    '--color-emerald',
    '--color-neon',
    '--color-neon-deep',
    ...SPECTRUM_STOPS.map((stop) => `--color-spectrum-${stop}`),
  ];

  /**
   * The same stops as class names, at **full strength**: the negative lookahead is what keeps
   * `bg-accent/15` — a tint over a panel — out of a sweep that would otherwise fail it.
   */
  const SOLID_GROUND =
    /(?<![\w-])(?:bg|from|to)-(?:accent(?:-strong|-soft)?|tab|gold|rose|emerald|neon(?:-deep)?)(?![\w/-])/;

  /**
   * The ramp as class names. `bg-` as well as `text-`, because the countdown bar took the ramp's
   * top tone as a `bg-` at 60% and measured 1.56:1 — a graphic on the ground rather than a label,
   * failing the same way for the same reason.
   *
   * `ring-` is deliberately absent: a ring is drawn outside the element, over whatever surrounds it,
   * so `ring-ink ring-offset-foundry-800` on an accent swatch sits on the panel and is correct.
   */
  const RAMP_CLASS = /(?<![\w-])(?:text|bg)-ink(?:-muted|-faint)?(?:\/\d+)?(?![\w-])/g;

  it('cannot carry a tone off the ink ramp, at any stop', () => {
    // Stated as a failure rather than left implied, because it is the half that makes the sweeps
    // below a rule instead of a preference: if a later palette change lifted the ramp clear of these
    // stops, the ban would be the thing to revisit, and this is what would say so.
    for (const ground of GROUNDS) {
      for (const tone of INK_RAMP) expect(contrastBetween(tone, ground)).toBeLessThan(4.5);
    }
  });

  it('carries the near-black instead, which clears AA on every stop', () => {
    // 5.34:1 at the worst of them, which is `accent-strong`. The accent the reader picked does not
    // move that: every hue holds the default's luminance, which the suite above asserts.
    for (const ground of GROUNDS) {
      expect(contrastBetween('--color-foundry-950', ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('leaves no ink tone anywhere inside an element painted with one', () => {
    const offenders: string[] = [];
    let grounds = 0;

    for (const file of scannableSources()) {
      const source = readFileSync(file, 'utf8');
      for (const attribute of source.matchAll(/className=/g)) {
        if (!SOLID_GROUND.test(staticClasses(source, attribute.index))) continue;
        const subtree = subtreeAt(source, attribute.index);
        if (subtree === null) continue;
        grounds++;
        for (const tone of subtree.matchAll(RAMP_CLASS)) offenders.push(`${basename(file)}: ${tone[0]}`);
      }
    }

    // A regex that stopped matching — a fill respelled, an attribute order the tag scan misreads —
    // would empty the sweep and pass it having read no ground at all. Nineteen exist as this is
    // written; the floor is well under that so a button added or removed is not a failure.
    expect(grounds).toBeGreaterThan(10);
    expect(offenders).toStrictEqual([]);
  });

  it('leaves no ink tone in a class string that paints one', () => {
    // The second sweep, and it is not a weaker copy of the first: it reads *one branch at a time*,
    // so it reaches the conditional grounds the subtree sweep steps over — `SegmentedChoice`'s
    // selected pill, `PresetCollectionList`'s active row — where the ground and the ink genuinely
    // belong to different states. It also reaches a class string hoisted out of JSX altogether,
    // which is where CLAUDE.md's directory rule sends a shared one and where no `className=` exists
    // to anchor a subtree on.
    //
    // What neither sweep covers is a *child* of a conditionally-grounded element:
    // `PresetCollectionList`'s count span is `text-foundry-950/70` when the row is active and
    // `text-ink-faint` when it is not, and nothing mechanical can pair those two ternaries up.
    const offenders: string[] = [];
    let strings = 0;

    for (const file of scannableSources()) {
      const source = readFileSync(file, 'utf8');
      for (const literal of source.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) {
        const text = literal[1] ?? literal[2] ?? '';
        if (!SOLID_GROUND.test(text)) continue;
        strings++;
        for (const tone of text.matchAll(RAMP_CLASS)) offenders.push(`${basename(file)}: ${tone[0]}`);
      }
    }

    // Twenty as this is written, for the same reason the floor above exists.
    expect(strings).toBeGreaterThan(10);
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

/**
 * The heatmap's ramp, held against the tokens it claims to be.
 *
 * The quantiser's difference mode paints the app's own severity colours into *pixel data*, inside a
 * pure function a worker may run — where there is no element to put a class on and no stylesheet to
 * read. So `src/constants/differenceRamp.ts` carries the values in code, which is a second place a
 * colour is written down and therefore a place two definitions can part company. This is what stops
 * them: the ramp names each token it mirrors, and the triple beside it has to be the triple the
 * stylesheet declares, digit for digit.
 *
 * Read from disk rather than imported — what is asserted is what the module *declares*, so a stop
 * that stopped being declared has to fail here rather than resolve. `spectrumStopAt` is the one
 * module this file imports, because the value it hands out is computed and cannot be read off the
 * page; `tests/` is the Node-side program, whose reach into `src/` stays limited to modules that
 * need no DOM.
 */
describe('the difference heatmap’s ramp', () => {
  const ramp = readFileSync(resolve(process.cwd(), 'src/constants/differenceRamp.ts'), 'utf8');
  const declaration = /property: '(--[a-z0-9-]+)', oklch: \[([\d.]+), ([\d.]+), ([\d.]+)\]/g;
  const stops = [...ramp.matchAll(declaration)].map((stop) => ({
    property: stop[1] ?? '',
    oklch: [Number(stop[2]), Number(stop[3]), Number(stop[4])] as [number, number, number],
  }));

  it('was parsed whole, so nothing below can pass by matching less than all of it', () => {
    // The guard every regex-driven assertion in this file needs, pinned to the *count* rather than
    // to a floor: only the first and last stops are checked by name below, so a middle one dropping
    // out of the pattern would otherwise stop being compared with the stylesheet and nothing would
    // say so. A fifth stop is meant to fail here — it needs a decision, not a silent pass.
    expect(stops).toHaveLength(4);
  });

  it.each(stops.map((stop) => [stop.property, stop.oklch] as const))(
    'states %s exactly as the stylesheet does',
    (property, oklch) => {
      expect(oklchToken(property)).toStrictEqual(oklch);
    },
  );

  it('runs from the page’s own ground to the colour this app uses for wrong', () => {
    // The ends are the ramp's meaning, not merely two of its values: a faithful pixel has to
    // disappear into the pane it sits in, and a lost one has to be the same red the form validation
    // and the destructive actions already speak. A ramp reordered so that "no difference" was the
    // loud end would render perfectly and say the opposite of what it means.
    expect(stops.at(0)?.property).toBe('--color-foundry-950');
    expect(stops.at(-1)?.property).toBe('--color-rose');
  });

  it('climbs out of the ground steeply, so the first mark on it is visible at all', () => {
    // The ground is the pane's own colour, so the stop after it carries the whole of the contrast
    // between "nothing here" and "something here". Anything close to the ground would make the low
    // end of every map unreadable — which is exactly the end the finest rungs of the scale exist to
    // read.
    const [ground, first] = [stops.at(0)?.oklch, stops.at(1)?.oklch];
    expect(first?.[0] ?? 0).toBeGreaterThan((ground?.[0] ?? 0) + 0.5);
  });
});

/**
 * The sprite outline's two marker colours, held against the tokens they claim to be.
 *
 * The same exemption the heatmap's ramp claims and therefore the same check: `spriteOutline.ts`
 * draws into pixel data inside a pure function, where there is no element to carry a class and no
 * stylesheet to read, so `src/constants/spriteMarker.ts` writes the values down a second time. The
 * point of that file naming the token beside each triple is that this can compare them.
 */
describe('the sprite outline’s markers', () => {
  const markers = readFileSync(resolve(process.cwd(), 'src/constants/spriteMarker.ts'), 'utf8');
  const declaration = /property: '(--[a-z0-9-]+)', oklch: \[([\d.]+), ([\d.]+), ([\d.]+)\]/g;
  const stops = [...markers.matchAll(declaration)].map((stop) => ({
    property: stop[1] ?? '',
    oklch: [Number(stop[2]), Number(stop[3]), Number(stop[4])] as [number, number, number],
  }));

  it('was parsed whole, so nothing below can pass by matching less than all of it', () => {
    // Pinned to the count, as the ramp's guard is: a third marker is meant to fail here, because the
    // outline alternates on a parity and a third colour would never be drawn.
    expect(stops).toHaveLength(2);
  });

  it.each(stops.map((stop) => [stop.property, stop.oklch] as const))(
    'states %s exactly as the stylesheet does',
    (property, oklch) => {
      expect(oklchToken(property)).toStrictEqual(oklch);
    },
  );

  it('pairs the darkest surface the app owns with the lightest, and neither with a hue', () => {
    // The mark lands on the reader's own artwork, so it has to separate from any lightness — which
    // is what the two ends of the app's own neutral range give it — and it must not claim a meaning,
    // which is what every chromatic token in this palette would. Both conditions are structural: a
    // stop swapped for `gold` would still render, and would read as a warning about the sprite.
    const [dark, light] = [stops.at(0)?.oklch, stops.at(1)?.oklch];
    expect(light?.[0] ?? 0).toBeGreaterThan((dark?.[0] ?? 0) + 0.7);
    for (const stop of stops) expect(stop.oklch[1]).toBeLessThan(0.05);
  });
});

describe('the browser chrome and the install splash', () => {
  /**
   * The colour a reader sees *before* and *around* the app is the app's own ground, or it is a seam.
   *
   * Three places state it and none of them can read a custom property: the `<meta name="theme-color">`
   * tag, and the manifest's `theme_color` and `background_color`. All three carried a hand-written
   * `#060911`, which is not a token — it sits between `foundry-950` (`#04050a`) and `foundry-900`
   * (`#0a0c12`), so the splash screen handed over to a visibly lighter page while the comment above
   * the meta tag asserted it could not. `scripts/themeColour.ts` derives the value from the
   * stylesheet instead, and this is what holds the derivation to the ramp.
   */
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
  const derived = themeColorHex(pathToFileURL(resolve(process.cwd(), 'src/index.css')));

  /** A linear-sRGB triple as the `#rrggbb` a manifest and a meta tag can carry. */
  function hexOf([r, g, b]: [number, number, number]): string {
    const encode = (linear: number) =>
      Math.round(255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055));
    return `#${[r, g, b].map((channel) => encode(channel).toString(16).padStart(2, '0')).join('')}`;
  }

  it('resolves to foundry-900, the page ground — by this suite’s own maths, not the helper’s', () => {
    // Converted here from the token the stylesheet declares, so a broken conversion in
    // `src/utils/oklab.ts` fails rather than agreeing with itself.
    expect(derived).toBe(hexOf(linearOf(oklchToken('--color-foundry-900'))));
  });

  it('is the colour `body` actually carries, which is what makes the hand-over seamless', () => {
    expect(stylesheet).toMatch(/body \{[^}]*background-color: var\(--color-foundry-900\)/);
  });

  it('leaves index.html a placeholder rather than a fourth copy of the value', () => {
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLOR_PLACEHOLDER}" />`);
    expect(html).not.toMatch(/name="theme-color" content="#/);
  });

  it('gives the manifest the derived constant for both of its two decisions', () => {
    // `theme_color` tints the browser's chrome and `background_color` paints the splash. They agree
    // here, and they have to be stated separately for that agreement to mean anything.
    expect(viteConfig).toMatch(/theme_color: THEME_COLOR,/);
    expect(viteConfig).toMatch(/background_color: THEME_COLOR,/);
  });

  it('writes the value down nowhere outside the stylesheet', () => {
    for (const source of [html, viteConfig]) expect(source).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
