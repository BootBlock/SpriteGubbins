---
name: verify
description: Drive the Sprite Gubbins PWA in a real browser to confirm a change works end-to-end.
---

# Verifying a change in Sprite Gubbins

Sprite Gubbins is a browser PWA backed by sqlite-wasm + OPFS. Verification means driving the
real app in Edge via Playwright — the database only exists inside a cross-origin-isolated
browser context, so there is no CLI or server surface to poke instead.

Types and unit tests do not cover the two things that actually break here: whether the app
reached the SQLite backend it thinks it did, and whether a control is reachable by keyboard.

## Handle

```bash
npm run dev          # http://localhost:5173/SpriteGubbins/
```

**Mind the base path.** The site is served from `/SpriteGubbins/` (GitHub Pages project site),
in dev as well as in production. `http://localhost:5173/` alone is a 404.

**Pick a port of your own.** 5173 is the configured default and `vite.config.ts` pins it with
`strictPort`, so a second `npm run dev` now **exits** rather than silently landing on 5174 — which
is the safe direction, because a script pointed at 5173 used to end up driving the *wrong app*. An
exit is the signal that something already holds the port; don't work around it by taking whatever
Vite offers next. Be explicit instead:

```bash
npx vite --port 5199 --strictPort
```

On Windows, launching the dev server detached through `npx` may fail to start at all;
invoking the bin directly is reliable:

```powershell
$port = 5199
$server = Start-Process node -ArgumentList 'node_modules/vite/bin/vite.js','--port',"$port",'--strictPort' `
  -WorkingDirectory 'p:\Source\TypeScript\SpriteGubbins\.claude\worktrees\<topic>' -PassThru -WindowStyle Hidden
```

**Then confirm the server on that port is *yours*.** Picking a port is not the same as getting
it, and the failure mode is genuinely nasty: another agent's tree may already be serving there,
in which case `--strictPort` makes *your* Vite exit immediately — while `curl` against the port
still answers 200, still sends the isolation headers, and still serves a Sprite Gubbins that
looks exactly right. Every probe passes and every assertion is being made against the wrong
application. This has already cost one full debugging cycle chasing a `data-tab` attribute that
was only "missing" because the page under test came from someone else's branch.

A 200 proves a server is there. It does not prove it is the one you started, so check the
process that actually holds the socket:

```powershell
Start-Sleep -Seconds 4
$owner = (Get-NetTCPConnection -LocalPort $port -State Listen -EA SilentlyContinue).OwningProcess
# $server.HasExited must be false, and $owner must equal $server.Id — anything else means the
# port was already taken and the thing answering it is not yours.
```

A second confirmation costs one request and catches the same class of problem however it arose —
a stale server, a tree you forgot you were serving, a port that moved under you. Ask the dev
server for a module you have just edited, and look for your own change in what comes back:

```bash
curl -s http://localhost:5199/SpriteGubbins/src/App.tsx | grep 'data-tab'
```

Vite serves source over that path unbundled, so the response is the file on disk in the tree that
server was started from. If your edit isn't in it, stop and find out whose tree is.

Then drive it with Playwright (a devDependency — **the script must live in the repo root** so
`import { chromium } from 'playwright'` resolves):

```js
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.setDefaultTimeout(8000);
page.setDefaultNavigationTimeout(30000);
await page.goto('http://localhost:5199/SpriteGubbins/', { waitUntil: 'domcontentloaded' });
```

## Check cross-origin isolation FIRST

This is the single highest-value diagnostic, and it explains most confusing persistence
behaviour. SQLite's OPFS VFS needs `SharedArrayBuffer`, which the browser only exposes to a
cross-origin-isolated context. Without it the database layer falls back to localStorage — by
design — and the app *looks* fine while persisting somewhere else entirely.

```js
const isolated = await page.evaluate(() => globalThis.crossOriginIsolated);
if (!isolated) throw new Error('Not cross-origin isolated — SQLite will use the localStorage fallback');
```

**Isolation arrives two different ways, and which one you are testing matters.**

- **Dev / preview** — `vite.config.ts` sets the headers on the server, so the page is isolated
  from the very first response. A `false` here means the request didn't come from one of those
  servers (a plain static server, a proxy, or a different port than you think). Confirm
  directly: `curl -sI http://localhost:5199/SpriteGubbins/ | grep -i cross-origin`.
- **Production (GitHub Pages)** — no server headers exist. `src/sw.ts` injects them, and
  `public/coi-bootstrap.js` reloads once after the worker takes control, so **the first load is
  legitimately not isolated** and the second is. Testing this path needs a header-less static
  server over `dist/`, not `npm run preview` (which would supply the headers itself and prove
  nothing). Wait for `navigator.serviceWorker.controller !== null`, then for
  `globalThis.crossOriginIsolated === true`.

Any change touching `src/db/` should be verified in **both** modes — isolated, and with the
fallback — because the fallback path is the one nobody exercises by accident.

## Gotchas that cost time

- **Every Playwright launch is a fresh profile → empty OPFS → no history and no custom
  presets.** Create whatever data the flow needs *in the same script run*; a probe that assumes
  a prompt was logged by an earlier run will time out looking for it.
- **The service worker is off in dev** (`devOptions: { enabled: false }` in `vite.config.ts`).
  Anything about installability, precaching, offline behaviour or the update flow must be
  verified against a production build: `npm run build && npm run preview` (preview sends the
  same isolation headers).
- **Wait on an element, not a timeout, after opening a modal.** Screenshotting straight after
  the click can capture a half-rendered frame mid-`animate-fade-in`. Do
  `await page.getByRole('dialog').waitFor({ state: 'visible' })` first.
- **Reduced motion changes what you see.** The `prefers-reduced-motion` block in
  `src/index.css` collapses every animation to ~0ms. `chromium.launch({ ... })` with
  `reducedMotion: 'reduce'` on the context is the *fast, deterministic* way to drive the UI —
  use it for flows, and only drive with motion enabled when the animation itself is the thing
  under test.
- **Run the script in the background** and poll its output file — a cold start plus a few
  flows comfortably exceeds a 2-minute foreground timeout.
- **Stop the dev server when you're done.** It holds handles under `node_modules`.

## Driving the UI

Prefer role-based locators (`getByRole('combobox', { name: … })`,
`getByRole('button', { name: /copy prompt/i })`) over CSS or test IDs. That is not only
robustness — CLAUDE.md requires the accessibility wiring, so **a role-based locator that
cannot find a control is itself a finding**: it means the control has no accessible name or
no role, and a keyboard or screen-reader user cannot reach it either.

Read the component under test for its actual markup rather than guessing selectors; the
studio panels, modals and tab views live under `src/components/`.

Two flows are worth driving whenever they are touched, because they cross the whole stack:

- **Compose → copy → history.** Pick a category, set a few fields, copy the prompt, open the
  history drawer, and confirm the entry came back from the database with the right model badge
  and word count. This exercises the stores, the compiler and persistence in one pass.
- **Keyboard-only ComboBox.** Tab to a field, open it, arrow through options, Enter to select,
  Escape to dismiss — without touching the mouse. The `ComboBox` is the app's most-used
  control and the easiest to leave mouse-only.
