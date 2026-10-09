# Sprite Gubbins review rules

The global `auto-review` skill reads this file at its step 2. It holds only what is Sprite Gubbins'
own; the lanes, the steps, checks A to H and the shared false positives are in the skill. The
project's standing gate is `/auto-review medium` (`CLAUDE.md`, *Verifying a change*).

## Rules to collect

- Always: the root `CLAUDE.md`, and `docs/todo/sprite-gubbins-spec.md`, which decides *what* is
  built and wins a disagreement. Note which spec phase, or which plan under `docs/todo/`, the
  change executes.
- The memory notes `CLAUDE.md`'s table names for each kind of change in the diff (in
  `P:/Source/!Memories/SpriteGubbins/`), and any other note the session start listed whose
  description matches what the diff touches. A rule in one of those notes is a `CLAUDE.md` rule.

## Compliance checklist (lane 1)

- **Design tokens.** A raw hex, `rgb()` or `oklch()`, a stock palette class (`bg-slate-900`,
  `text-cyan-400`), a bracketed `text-[…px]`, an inline `cubic-bezier` or inline `@keyframes`,
  where a `foundry`, `neon`, `gold`, `emerald`, `rose`, `ink` or other `@theme` token in
  `src/index.css` exists. Raw colour literals are sanctioned only in `ColorSwatch`'s inline `style`
  (it renders a colour that is not the app's) and in the domain-data paths
  `tests/raw-colour-literals.test.ts` exempts.
- **The structural laws.** A file over 150 lines of code, more than one thing exported per file,
  or a file in the wrong directory for its concern (domain logic outside `src/utils/`, persistence
  outside `src/db/`, constants inlined into a component, logic in `src/workers/`, a component that
  owns a thread).
- **The banned patterns.** Derived state synchronised through an effect; `as any`,
  `as unknown as T` or `@ts-ignore`; an `eslint-disable` comment (`noInlineConfig` ignores it, so it
  is noise and a violation); `forEach(async …)` or a floating promise; an effect that registers a
  listener, timer or worker callback with no cleanup; selecting a whole store
  (`useSubjectStore()` rather than `useSubjectStore((s) => s.category)`); prop-drilling past three
  levels.
- **No backwards compatibility before 1.0.0.** An alias or forwarding re-export, a `@deprecated`
  wrapper, a second read path for a previous shape (`typeof value === 'string'` for a field that is
  now an object, `oldKey ?? newKey`), migration or row-repair machinery in `src/db/`, a fixture
  proving a retired format still loads, or a `v2` beside an undeleted `v1`.
- **Completeness.** `// TODO: add remaining fields`, `/* rest of options here */`, an option array
  that is visibly a subset, or a stubbed body breaks the spec's zero-truncation mandate.
- **Accessibility.** An interactive `<div>` or `<span>` without a role and keyboard handling, an
  icon-only button with no `aria-label`, a decorative element missing `aria-hidden`, a toast outside
  a live region, a removed focus ring, a `ComboBox` change that breaks listbox semantics.
- **Guidance and copy.** A control with no `Tooltip` or `ControlTooltip`, a `title` attribute, or a
  user-facing string in American spelling or with straight quotes.
- **No secrets, public hygiene.** Anything credential-shaped, real personal data, or any model-API
  surface: a key field, an image-generation request or a proxy. The app makes no model calls.

## Lane 8: the project's failure mode

Slug `public-leak-or-lost-work`. This repository is public and the app keeps a user's work only in
the browser. Build a concrete scenario against the diff that ends in one of these, and check it
against the code:

- A secret, real personal data, a local database or a prompt archive reaches a tracked file or a
  commit message.
- The app gains a model API key, an outbound model request, or a cross-origin subresource.
- A stored value, a saved project or the history is lost or unreadable on either storage backend
  (SQLite over OPFS or the localStorage fallback), short of the documented discard of an incompatible
  database, or a stored value naming a retired option fails rather than falling back to its default.
- The service worker serves a stale or missing precached asset, or loses cross-origin isolation.

Lane 8 runs at `ultra` only; it is not required at every level.

## Known instances of checks A to H

- **A. Phantom surface.** An unknown Tailwind utility emits no CSS and no error: a `bg-foundy-800`,
  or an `animate-*` with no `--animate-*` in a `@theme` block of `src/index.css`. A colour name
  `parseColorFromText` expects with no entry in `COLOR_HEX_MAP` (`src/constants/colors.ts`). A store
  action no store in `src/stores/` defines. A `subject` field key no category in `CATEGORY_OPTIONS`
  defines. A `TargetModelId` or `SubjectCategory` member the union in `src/types/` lacks. A column
  `src/db/schema.ts`'s DDL never creates. An export the installed version of a package lacks.
- **B. Half-applied parallel edit.** A new `SubjectCategory` member without its `CATEGORY_OPTIONS`
  entry and its tile in `CategorySelector`. A new field in a category's option pool without its
  tooltip. A new `TargetModelId` in `TARGET_MODELS` (`src/constants/models.ts`) without its arm in
  `src/utils/modelWrappers.ts`, or the reverse. A new `OutputConfig` field without a default in
  `useOutputStore`, a control in `OutputConfig.tsx` and a read in `promptCompiler.ts`. A new column
  without its mapping on both storage backends and its field on the type in `src/types/`. A preset
  under `src/constants/presets/` whose `subject` misses a field its category declares. A worker
  message added to one side of its protocol only.
- **C. Re-implemented seam.** Colour parsing outside `src/utils/colorParser.ts`; grid and cell-size
  maths outside `src/utils/atlasCalculator.ts`; prompt assembly outside `promptCompiler.ts` or model
  wrapping outside `modelWrappers.ts`; storage access outside `src/db/`; a bare styled `<input>`,
  `<button>` or `<select>` instead of a primitive from `src/components/common/`; a second toast
  mechanism beside `useUIStore`'s `showToast`.
- **D. Dead on arrival.** Every `CATEGORY_OPTIONS` and `PRESETS` entry is reached by iteration,
  never by name, so search for the registry, not the entry.
- **E. Test theatre.** A prompt-compiler test that only checks the output is a non-empty string
  proves nothing about the compiled prompt.
- **F. Suppression.** A new blanket override in `eslint.config.js`, a non-null `!`, or a catch that
  swallows (empty, a bare `console.error`, `catch { return null }`). The guards against corrupt
  storage in `src/db/` and the documented OPFS-to-localStorage fallback are specified behaviour.
- **G. Scope creep.** The spec pins a small dependency list: a new runtime dependency needs a stated
  reason in the commit message.
- **H. Unbacked claim.** Also `console.log` and `debugger`. A comment or commit naming an agent or
  the process that produced it breaks public-repository hygiene.

## Where definitions hide (check A)

Barrel `index.ts` files under `src/constants/` (`categories/`, `hardware/`, `iconCatalogue/`,
`output/`, `palettes/`); `*.d.ts` files; the `@theme` blocks of `src/index.css`, the only home of a
token or `--animate-*`; string-keyed lookups and dynamic imports; worker protocols in `src/workers/`
and `src/db/workerProtocol.ts`; `vite.config.ts` (precache, PWA manifest) and `public/`.

## Project false positives

- The long option arrays, tooltips and preset definitions in `src/constants/`: the spec mandates
  complete fidelity, so their volume is the requirement. Flag a constants file only if it mixes in
  logic that belongs in `src/utils/`.
- The type guards in `src/db/configParsers.ts` and the other parsers in `src/db/`, the localStorage
  fallback, the cross-origin-isolation apparatus and the `showPopover` detection in
  `useAnchoredSurface`: they defend the browser a user has today, not an old version of this app.
- Loose types and type suppressions in test files and fixtures, where they are idiomatic.
