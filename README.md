# Sprite Gubbins

A local-first, offline-capable Progressive Web App for composing precise, model-targeted
prompts for **game sprite sheets and texture atlases**.

Pick a subject category, fill in the fields, choose your output constraints and target model,
and Sprite Gubbins compiles a prompt shaped for that model's conventions — ChatGPT reasoning
contracts, Midjourney flags, Stable Diffusion negative blocks, Imagen and DALL·E prefixes, or
plain generic text. It also works out atlas grid layouts and power-of-two VRAM budgets, and
exports engine metadata for Godot, Unity and PixiJS.

Everything runs in the browser. There is no server, no account, and **no model API key** —
the app produces prompt *text* for you to paste wherever you like. Prompt history and custom
presets are stored locally in SQLite (WebAssembly, persisted to the Origin Private File
System).

## Status

**Phase 1 of 5 complete** — build system, PWA shell, design tokens and linting are in place
and verified. The domain layer, state stores and studio UI (Phases 2–4) are next. The
implementation blueprint is [docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md).

## Getting started

Requires Node 24 or newer (see [.nvmrc](.nvmrc)).

```bash
npm install
npm run dev        # http://localhost:5173/
```

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

## Cross-origin isolation

SQLite's high-performance OPFS backend coordinates through `SharedArrayBuffer`, which browsers
expose only to cross-origin-isolated contexts. The dev and preview servers send
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`
automatically; **a production host must be configured to send them too.** Where they are
missing the app still works — the database layer falls back to `localStorage` — but the
SQLite-backed history and preset storage will not be used.

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
