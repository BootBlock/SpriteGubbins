# Sprite Gubbins — working conventions

> 🔒 **NEVER COMMIT SECRETS.** This repository is **public**. No API keys, tokens,
> passwords, private keys, connection strings, or personal data may ever enter the working
> tree, a commit, or git history. Read the section below before adding any credential-shaped
> value or committing changes.

> ⚠️ **USE DESIGN TOKENS, NOT HARD-CODED VALUES.** This is the one rule that is easy to
> break and hard to spot in review. Read the section below before adding any colour,
> spacing, radius, easing, or other visual value.

Sprite Gubbins is a browser PWA that composes precise, model-targeted prompts for generating
game sprite sheets and texture atlases. It is offline-capable, has no server, and persists its
prompt history and custom presets in browser-embedded SQLite (WASM + OPFS).

**The specification is [docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md)** —
the five-phase implementation blueprint, the full field/option/tooltip inventory, and the
architectural guardrails this file operationalises. When the two disagree about *what to
build*, the spec wins; this file governs *how* it gets built.

## No secrets in the repository (mandatory)

This is a **public** repository. Committing a secret is treated as a build-breaking error —
secrets are effectively permanent once pushed (they live in history and may be scraped within
seconds), so the only safe rule is to never let one in.

**Hard rules — these are not negotiable:**

- **Never** write an API key, token, password, secret, private key, certificate, OAuth
  client secret, session cookie, or connection string into any tracked file — including
  source, tests, fixtures, docs, comments, config, and commit messages. Use an obvious
  placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) when an example is genuinely needed.
- **This app never handles a model API key.** It composes prompt *text* for the user to paste
  into ChatGPT / Midjourney / Stable Diffusion themselves — it makes no outbound model calls.
  If a change proposes an API key field, an image-generation request, or a proxy, that is a
  new architecture, not an increment: stop and raise it rather than introducing a credential
  surface this app has deliberately never had.
- **Never** commit real personal data: private email addresses, phone numbers, real names
  tied to private accounts, internal hostnames, or IP addresses. Use the GitHub `noreply`
  identity (`BootBlock@users.noreply.github.com`), `example.com` / `*.test` domains, and
  `localhost` in examples and tests.
- **Secrets belong in `.env` only.** `.env` and `.env.*` are git-ignored. Read configuration
  from the environment at runtime — never inline it.
- **Never** commit data artefacts that may carry real content: `*.sqlite`/`*.db`, database
  dumps, exported prompt archives, `.pem`/`.key`/`.pfx`/`.p12`/keystores, or `id_rsa*`.
- **Before every commit, self-audit the diff.** Run `git diff --cached` and scan for
  anything credential-shaped or personal. If a secret is in doubt, leave it out and ask.
- **If a secret is ever committed, stop.** Treat it as compromised: it must be rotated/revoked
  at the source, and the history scrubbed — removing it in a later commit is **not**
  sufficient. Surface this immediately rather than quietly continuing.

## Public-repository hygiene (mandatory)

Everything here — code, comments, commit messages, branch names, docs, and history — is
**world-readable and permanent**. Write it as if a stranger will read it tomorrow, because
they can.

- **Stay professional and neutral.** No profanity, disparaging remarks, jokes at anyone's
  expense, or venting in code, comments, or commit messages. No TODOs that name or blame a
  person.
- **No internal-only references.** Don't embed private ticket IDs, internal wiki/Jira/Slack
  URLs, internal hostnames, server names, or other infrastructure details a stranger
  shouldn't see. Describe the *what* and *why*, not internal plumbing.
- **Prompt content is user-facing copy.** Field options, tooltips and preset names ship in the
  bundle and are read by strangers. Keep them descriptive and neutral — this is a tool for
  making game art, and the vocabulary should stay squarely there.
- **Dependency & IP hygiene.** Don't paste code from sources with an incompatible or unknown
  licence; prefer writing it or using a properly-attributed, licence-compatible dependency.
  Vet new dependencies (popularity, maintenance, licence) before adding them, and keep the
  dependency surface minimal — the spec pins a deliberately small list. This repo is licensed
  **MIT** (see [LICENSE](LICENSE)) — keep `package.json`'s `license` field and any added
  licence headers consistent with it, and don't introduce text implying a different licence.
- **Keep the ignore rules tight.** Before committing a new kind of generated or local file,
  confirm it belongs in the repo; if it's a build artefact, local cache, or could contain
  real data, add it to `.gitignore` instead.

## Agent attribution on GitHub content (mandatory)

Anything **you** post or edit on GitHub on the maintainer's behalf must carry an attribution
trailer disclosing that an agent wrote it for @BootBlock. This applies to **every** GitHub
issue and pull-request **comment** *and* every issue/PR **description or body** you author or
edit — not just issues you action end-to-end. Attribution is disclosure, not internal process,
so it always stays (unlike the process/plumbing that must never leak — see
[public-repository hygiene](#public-repository-hygiene-mandatory)).

Append it as the **last lines**, after a `---` rule, wording the verb to match what you did:

```markdown
---
This <issue|pull request> was <actioned|opened|updated> by an agent on behalf of @BootBlock.
```

- **Comment on an issue you actioned end-to-end** → `This issue was actioned by an agent on
  behalf of @BootBlock.`
- **Issue/PR you opened** → use `opened`; a **body you edited** → `updated`; a **pull request**
  → `pull request` in place of `issue`.

The only time to omit it is when GitHub gives you no body to sign (e.g. adding a label). If in
doubt, include it. This does **not** apply to git commit messages — those carry the
`Co-Authored-By` trailer instead.

## Design tokens are mandatory where one exists

Every colour and motion value in the UI must come from a **design token**, never a raw
hex / `rgb()` / `oklch()` literal or an ad-hoc Tailwind palette class (`text-cyan-400`,
`bg-slate-900`, …). Tokens are defined in the `@theme` block of
[src/index.css](src/index.css) and Tailwind generates the utilities from them.

This is the spec's own "**NO Hardcoded Magic Values**" guardrail, made concrete: a `#060911`
or a `bg-slate-900` scattered through a component is exactly the magic value the spec bans.

| Need | Use | Not |
| --- | --- | --- |
| The page ground | `bg-foundry-900` | `bg-slate-950`, `#060911` |
| An inset or well *below* the page (prompt box, code panel) | `bg-foundry-950` | `bg-slate-950` |
| A panel resting on the page | `bg-foundry-800` | `bg-slate-900` |
| A control or row inside a panel | `bg-foundry-700` | `bg-slate-800` |
| A border, or a hover/pressed state | `border-foundry-600` / `bg-foundry-600` | `border-slate-700` |
| **Primary** action, focus, selection, ambience | `accent` / `accent-strong` / `accent-soft` | `bg-indigo-500`, `#6366f1` |
| **Live** state — auto-sync, generating, updating as you type | `neon` / `neon-deep` | `text-cyan-400`, `#22d3ee` |
| "Needs attention" chips and badges | `gold` | `text-amber-400` |
| Success / valid / power-of-two clean | `emerald` | `text-emerald-400` |
| Error / invalid / destructive | `rose` | `text-red-500` |
| Body, secondary and faint text | `text-ink` / `text-ink-muted` / `text-ink-faint` | `text-slate-300` |
| Prompt text, metrics, JSON | `font-mono` | a raw font stack |
| Panel entrance, live pulse, ambience, loading | `animate-fade-in` / `animate-pulse-glow` / `animate-float-orb` (+ `-slow`) / `animate-shimmer` | inline `@keyframes`, one-off durations |
| Signature easing | `ease-emphasized` | `cubic-bezier(...)` inline |
| The ambient dot backdrop | `bg-grid-pattern` | a hand-rolled repeating gradient |
| A loading placeholder's sheen | `shimmer-surface` + `animate-shimmer` | a bespoke gradient |

**`accent` and `neon` are not interchangeable.** Indigo is the primary — actions, focus,
selection, the background glow. Cyan marks something *live*: auto-syncing, generating,
recomputing as the user types. The `pulse-glow` animation deliberately blooms from one to the
other because that transition is the signal. Using cyan for an ordinary button, or indigo for a
live badge, quietly destroys that distinction.

**Rules of thumb**

- If a token *doesn't* exist for a genuinely new semantic role, **add the token** to the
  `@theme` block in [src/index.css](src/index.css) rather than hard-coding the value at the
  call site. One definition, restyleable in one place.
- **The colour-swatch surface is the deliberate exception.** `ColorSwatch` renders whatever
  hex `parseColorFromText` resolved — a *user's* colour, not the app's — so it takes its value
  as a prop via inline `style`. `COLOR_HEX_MAP` in `src/constants/colors.ts` is likewise the
  one place raw hex literals belong: it is domain data (the vocabulary the prompt compiler
  understands), not app styling. Nothing else gets to claim that exemption.
- A raw colour/easing literal anywhere else is a smell — it bypasses the palette and the
  reduced-motion catch-all at the bottom of `index.css`.

**Unknown Tailwind utilities fail silently** — no CSS, no error, no warning. A typo'd
`bg-foundy-800` simply renders unstyled. When a change introduces a token-based utility,
verify it actually emits: build and grep the output CSS for the class name before trusting it.

## Architecture: the spec's structural laws

These are the spec's guardrails, restated here because they govern every change, not just the
initial build. They are not stylistic preferences.

- **No monolithic files.** Target **under 150 lines**. A file heading past that is telling you
  it has taken on a second responsibility — split it.
- **One thing per file.** Every component, hook, store, utility and type definition lives in
  its own dedicated file, named for the thing it exports.
- **Separation of concerns is directory-enforced.** Domain and compiler logic in `src/utils/`;
  state in `src/stores/`; persistence in `src/db/`; browser-effect and shared-interaction hooks in
  `src/hooks/`; constants in `src/constants/`; types in `src/types/`; UI primitives in
  `src/components/common/`; studio panels in `src/components/studio/`; the quantiser's image panels
  in `src/components/quantise/`; modals in `src/components/modals/`; tab views in
  `src/components/tabs/`; chrome in `src/components/layout/`. A file in the wrong directory is a
  design error, not a filing error.
- **`src/hooks/` exists because `src/utils/` must stay pure.** The clipboard, file downloads and
  the combo box's keyboard state machine are all impure — they touch `navigator`, the DOM, or a
  store — so they cannot live in `src/utils/`, and they are not components. A hook belongs there
  when it is genuinely shared (two or more call sites) and needs React or store access; a hook that
  only wraps a single `useState` is the "abstraction soup" the spec bans, wherever it is filed.
- **Utilities are pure.** Everything in `src/utils/` is a plain function of its arguments — no
  store reads, no DOM, no I/O. That is what makes the prompt compiler and the atlas maths
  testable, and the tests are where their correctness is actually established.
- **YAGNI.** Build what the spec describes and nothing else. No speculative abstraction
  layers, wrapper hooks around a single `useState`, factory functions for simple transforms,
  or configuration knobs nobody asked for.
- **DRY.** Reuse the primitives in `src/components/common/` (`ComboBox`, `Tooltip`,
  `ColorSwatch`, `Badge`, `Toast`) rather than re-styling a bare `<input>` or `<button>`. A
  second, subtly-different implementation of a solved problem is the failure mode to watch for.
- **Completeness.** Never write `// TODO: add remaining fields`, `/* rest of options here */`,
  or a stubbed function body. Every category, field, option, tooltip and compiler rule ships
  whole or not at all.

## Banned patterns, and which ones the build catches

The spec's anti-pattern list, with the enforcement that backs each one. Where a rule is
machine-enforced, the build fails — don't go looking for a way around it.

| Banned | Enforced by |
| --- | --- |
| Deriving state via `useState` + `useEffect` (word counts, token estimates, compiled prompts) | `react-hooks` v7 compiler rules (`set-state-in-effect`, …), enabled in full in `eslint.config.js` |
| `as any`, `@ts-ignore`, `@ts-nocheck` | `@typescript-eslint/no-explicit-any`, `ban-ts-comment` |
| `eslint-disable` comments | `linterOptions.noInlineConfig` — inline disables are **ignored**, so the rule still fires |
| `forEach(async …)`, floating promises | `@typescript-eslint/no-floating-promises`, `no-misused-promises` |
| Unsafe array indexing (`array[0].prop`) | `noUncheckedIndexedAccess` in `tsconfig.app.json` |
| Missing effect cleanup (listeners, timers, worker callbacks) | **Not machine-enforced.** Every `useEffect` that registers anything returns a cleanup function; React 19 Strict Mode double-invokes in dev, which is how you find the ones that don't. |
| Prop-drilling through 3+ levels when a store exists | **Not machine-enforced.** Consume Zustand directly with atomic selectors — `useSubjectStore((s) => s.category)`, never `useSubjectStore()` wholesale, which re-renders on every unrelated field edit. |
| Hardcoded magic values | See [design tokens](#design-tokens-are-mandatory-where-one-exists); non-visual constants live in `src/constants/`. |

`as unknown as T` is banned by the spec but has no rule that catches it — treat it as a review
finding. The fix is a type guard or a narrower union, never a wider cast.

## Cross-origin isolation, and what actually depends on it

The app makes itself cross-origin isolated, **two different ways**:

- **Dev and preview** — `server.headers` / `preview.headers` in `vite.config.ts` send
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- **Production** — GitHub Pages sends no custom headers, so [src/sw.ts](src/sw.ts) injects them
  onto every response instead, and [public/coi-bootstrap.js](public/coi-bootstrap.js) reloads
  the page once after that worker first takes control. **The first visit is never isolated**;
  it becomes so on the reload.

That apparatus was built on the understanding that the database needed it. It does not — see the
first point below — so isolation is a property this app maintains rather than one it currently
depends on. Removing it would be a decision about the COEP subresource posture, not about
persistence; leaving it costs one reload on a first visit.

Four consequences to hold on to:

- **What SQLite actually needs is a worker, not isolation.** The SAH-pool VFS this app installs
  requires `FileSystemFileHandle.prototype.createSyncAccessHandle`, which browsers expose **only
  inside a worker** — on the main thread the property is simply absent, so
  `installOpfsSAHPoolVfs` throws `Missing required OPFS APIs` however isolated the page is. That
  is why the database lives in [src/db/sqliteWorker.ts](src/db/sqliteWorker.ts) behind the message
  bridge in `sqliteBackend.ts`, and why moving it back onto the main thread would silently return
  the whole app to the localStorage fallback — which is exactly what it did before the worker
  existed.

  It does **not** need `SharedArrayBuffer`, and therefore does not need cross-origin isolation:
  verified by installing the pool and writing a row from a worker on a host sending no COOP/COEP,
  with `crossOriginIsolated === false` and `SharedArrayBuffer` undefined. That check belongs to the
  *plain* `opfs` VFS, which this app does not use. So the isolation apparatus below is not what
  makes the database work — treat the two as separate concerns, and verify each by running it
  rather than by reasoning from the other.
- **The localStorage fallback in `src/db` is a specified behaviour, not a safety net.** It runs
  wherever OPFS itself is unavailable — a private window, a browser without it, an exhausted
  quota — which is a narrower set of cases than "before the first reload", now that isolation is
  not what the database waits for. Changes to the database layer must work in both modes; the
  fallback is the path nobody exercises by accident, which is why it has its own tests.
- **The app must not load a cross-origin subresource.** Under COEP `require-corp` anything from
  another origin that doesn't opt in is blocked outright — which is why the fonts fall back to
  system faces rather than fetching a webfont, as the original single-file app did.
- **`sw.ts` is not a generated file.** The build uses vite-plugin-pwa's `injectManifest`
  strategy precisely so the worker can carry this custom fetch logic; a `generateSW` worker
  cannot express it. Treat it as app code.

Verify isolation with `globalThis.crossOriginIsolated` in the page, not by reading the config —
the `verify` skill covers this.

## Accessibility is not optional

`eslint-plugin-jsx-a11y` runs at error severity, but it only catches the mechanical half.

- No interactive `<div>` / `<span>` without a role and a keyboard handler. The `ComboBox` is
  the one to get right: it needs real listbox semantics (`role`, `aria-expanded`,
  `aria-activedescendant`, arrow/Escape/Enter handling), not a styled `<input>` with a
  click-to-open panel.
- No icon-only button without an `aria-label` — the header's atlas, history and copy actions
  are all icon-first.
- Decorative icons and the ambient backdrop get `aria-hidden="true"`.
- Toasts announce through a live region; a copy confirmation nobody can hear is not a
  confirmation.
- Every screen keeps its `<main id="main-content">` landmark.
- The global `:focus-visible` ring in `index.css` covers the whole app — don't remove it
  per-component, and don't re-implement it either.

## Verifying a change

```bash
npm run type-check     # tsc -b --noEmit, across the app and the Vite config
npm run lint           # eslint . — 0 errors, and inline disables cannot silence it
npm run test:run       # vitest run — the pure utilities are where correctness lives
npm run build          # tsc -b && vite build — must emit dist/ + a valid service worker
npm run format         # prettier --write . before committing
```

The spec's Phase 5 gate is `lint` and `build` clean. Run all four — types, lint, tests, build —
before considering a change done.

**Where the change has a runtime surface, drive it** rather than trusting types alone; the
`verify` skill covers running the app and the cross-origin-isolation gotcha that decides
whether SQLite gets OPFS or falls back. **Then run `/auto-review high`** (the `auto-review`
skill) over the diff and fix every confirmed finding.

Tests import `describe` / `it` / `expect` from `vitest` explicitly — Vitest runs without
`globals`, which is what keeps test files inside the app's TypeScript program so `tsc -b`
type-checks them too.

## Plan docs carry a status (`docs/todo/`)

The plan and specification documents in [docs/todo](docs/todo) are long-lived and
world-readable, and a **finished** plan reads exactly like a live one unless it says so. That is
how stale guidance gets followed.

**The rule:** every `.md` under `docs/todo/` opens with a status banner directly after its
heading, and finished work is archived:

```markdown
> **Status:** 🟢 ACTIVE — Phase 1 shipped; Phase 2 next.
```

- **`🟢 ACTIVE`** / **`📘 REFERENCE`** stay in `docs/todo/`; **`✅ COMPLETE`** /
  **`⛔ SUPERSEDED`** move to `docs/todo/done/`. Full definitions in
  [docs/todo/README.md](docs/todo/README.md).
- **When a phase ships, update the spec's banner in the same change.** It is the one place a
  reader learns how far the implementation has actually got.
- **Never rewrite a plan's history to match current practice.** A record of what a phase did is
  evidence; editing it to name today's command asserts something that never happened.
- A unit test ([tests/docs-todo-status.test.ts](tests/docs-todo-status.test.ts)) enforces the
  banner and the placement, so drift fails the build rather than review. It can't judge whether
  "COMPLETE" is *true* — that's yours.

### Multi-line text goes through a file, not inline quoting

Multi-line commit messages, PR bodies, and issue/PR comments must be passed via a **file**, not
inline shell quoting: write the text to a file, then `git commit -F <file>` and
`gh … --body-file <file>`. Inline quoting for multi-line text is error-prone — a wrong
here-string delimiter can silently wrap the whole message in stray characters, and by the time
it reaches a pushed commit or a posted comment it is expensive or impossible to fix cleanly. A
file sidesteps all shell-quoting rules regardless of which shell runs the command.
