# Sprite Gubbins

A local-first, offline-capable Progressive Web App for composing precise, model-targeted
prompts for **game sprite sheets and texture atlases**.

Pick a subject category, fill in the fields, choose your output constraints and target model,
and Sprite Gubbins compiles a prompt shaped for that model's conventions — ChatGPT reasoning
contracts, Midjourney flags, Stable Diffusion and Qwen-Image negative blocks, a GPT Image
directive, a Seedream planning note, or plain text for the Gemini image models, which need none.
It also warns when a prompt has outgrown what the chosen target is documented to read. It works
out atlas grid layouts and VRAM budgets, and exports engine metadata for Godot, Unity and PixiJS.

When the sheet comes back, the Quantise tab finishes the job the prompt cannot. No wording makes
a model return genuine pixel art, so the app does it to the returned image instead: it keys out
the background, snaps the artwork to a pixel grid, reduces it to a palette you can lock, and
writes the result out as a PNG, an Aseprite document, a sprite pack or a manifest.

Everything runs in the browser. There is no server, no account, and **no model API key** —
the app produces prompt *text* for you to paste wherever you like. Prompt history, custom
presets and your interface settings are stored locally in SQLite (WebAssembly, persisted to
the Origin Private File System).

A Settings dialog in the header carries the app-wide preferences: the accent colour, whether
the ambient backdrop is painted, an in-app reduced-motion switch, and which view the app opens
on. None of them changes what a prompt says, and none of them repaints the per-view colours —
the Studio, Quantise, Presets and Architecture tabs keep their own, which is how the page says
where you are.

## Status

**All five phases have shipped.** The build system and PWA shell, the design tokens, the domain
types and option pools, the prompt compiler, SQLite-on-OPFS persistence with its localStorage
fallback, the Zustand stores and the full component tree are all in place and verified. The app
carries the Studio, Quantise, Presets and Architecture tabs, the bundled preset library, the
atlas calculator, the prompt history and the sheet-splitting drawer.

The version is still `0.x`, which means exactly what it says: **any release may break anything**,
including stored history, saved presets, option identifiers and the wording of a compiled prompt.
The implementation blueprint is
[docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md), kept as the durable
reference the code is held to rather than as open work.

## Getting started

Requires Node 24 or newer (`engines.node` in [package.json](package.json)). The version
pinned in [.nvmrc](.nvmrc), and installed by CI, is 25.

**Quick start (Windows):** double-click **`Run.bat`**, or run **`.\Run.ps1`** in PowerShell.
Either installs dependencies on first use, starts the app, and opens a browser at
`http://127.0.0.1:5173/SpriteGubbins/` — but only once the server genuinely answers, so it never
lands on a not-yet-ready page. Pass `preview` (`Run.bat preview` / `.\Run.ps1 preview`) to build
the production bundle and serve *that* — real service worker, real offline behaviour — at
`http://127.0.0.1:4173/SpriteGubbins/` instead.

Stop the server with Ctrl+C in that window rather than the [X] button: [X] orphans the
node/vite process tree and leaves it squatting on the port.

**Launcher options:** `Run.bat` and `Run.ps1` take the same parameters — `Run.bat` just forwards
to `Run.ps1`, which holds the actual logic. Pass them straight through (e.g. `Run.bat -Port 8080`,
or `.\Run.ps1 -BindHost localhost`):

| Option | Default | What it does |
| --- | --- | --- |
| `preview` | — | Build the production bundle and serve *that* (real service worker + offline) instead of the hot-reload dev server. |
| `-BindHost <host>` | `127.0.0.1` | Host to bind and open. Use `localhost` to keep the `localhost` origin — Vite is then bound dual-stack for reliability, at the cost of a one-time Windows Firewall prompt and the dev server being visible on the LAN. `$env:SPRITE_GUBBINS_DEV_HOST` overrides the default. |
| `-Port <n>` | `5173` dev / `4173` preview | Pin a specific port. It is used exactly as given — if something else holds it the launcher stops rather than quietly moving you elsewhere. Only the *default* port falls back to the next free one. |
| `-Browser <exe\|path\|none>` | OS default | Open the app in a specific browser, or `none` to suppress the auto-open. Overrides the legacy `$env:BROWSER`. |
| `-NoOpen` | off | Start the server without opening a browser — just print the URL (handy for headless boxes, scripting, or an already-open tab). |

> **Why `127.0.0.1` and not `localhost`?** On Windows `localhost` resolves to both `::1` (IPv6)
> and `127.0.0.1` (IPv4), but Vite binds only one of them; if the browser then tries the other
> first it gets a connection-refused "unable to connect" page and you have to reload. Binding
> *and* opening the same concrete address removes that race.

> **Sharing port 5173 with the sibling Gubbins app?** The launcher recognises a running server by
> *this* app's base path and page title, not merely by "something is listening" — so it will
> never open Gubbins believing it to be Sprite Gubbins, and takes the next free port instead.
> Browser storage is per-origin, and a different host or port is a different origin: a shuffled
> port starts with an empty database. Pass `-Port` to pin one and keep coming back to the same
> local data.

Or use npm directly:

```bash
npm install
npm run dev        # http://localhost:5173/SpriteGubbins/
```

The site is served from `/SpriteGubbins/` — it deploys as a GitHub Pages project site, and dev
mirrors that so paths behave identically in both.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, with the cross-origin isolation headers SQLite/OPFS needs |
| `npm run build` | Type-check, then build the production bundle and service worker into `dist/` |
| `npm run preview` | Serve `dist/` locally, isolation headers included |
| `npm run test` / `test:run` | Vitest, in watch and single-run modes |
| `npm run type-check` | `tsc -b --noEmit` across the app and the Vite config |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run icons` | Regenerate the app icon set from the source pixel glyph |

## Where the database runs

SQLite reaches the Origin Private File System through synchronous access handles, and browsers
expose those **only inside a worker**. The database therefore lives in a dedicated worker
(`src/db/sqliteWorker.ts`) and the app talks to it by message — which also keeps every query off
the thread that draws the interface. Where OPFS is unavailable at all (a private window, a browser
without it, an exhausted quota) the same interface is served from `localStorage` instead.

## Cross-origin isolation

The app also makes itself cross-origin isolated:

- **Locally**, the dev and preview servers send `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` themselves.
- **In production**, GitHub Pages sends no custom headers, so the app's own service worker adds
  them to the responses it serves from this origin, and a small bootstrap script reloads the page
  once after that worker first takes control. The very first visit is therefore not isolated; the
  reload fixes it. Another origin's response is passed through exactly as that origin sent it — a
  proxy cannot state on its behalf who may embed it.

This is independent of the database. The SAH-pool VFS the app uses needs neither
`SharedArrayBuffer` nor isolation — only the worker above — so a not-yet-isolated first visit still
gets SQLite. Under `require-corp` the app must not load a cross-origin subresource, which is why
the fonts fall back to system faces rather than fetching a webfont.

## Built with

Vite, React 19, TypeScript (strict, with `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`), Tailwind CSS 4, Zustand, `@sqlite.org/sqlite-wasm`, and
`vite-plugin-pwa`.

## Contributing

Working conventions — design tokens, the structural laws, the banned patterns and the
verification gate — are in [CLAUDE.md](CLAUDE.md), with a short index in
[AGENTS.md](AGENTS.md).

## Licence

[MIT](LICENSE) © Joe Cox
