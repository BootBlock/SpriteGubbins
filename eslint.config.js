// Flat ESLint config (ESLint 9). Codifies the house style — 2-space, single-quote,
// braceless single-line guards — and, more importantly, turns several of the spec's
// architectural bans into rules a machine enforces rather than rules a reviewer has to
// remember. Formatting (whitespace/quotes/width) is Prettier's job; `eslint-config-prettier`
// (last) switches off every rule that would fight it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Never lint build output, deps, or generated service-worker scaffolding.
  //
  // `.claude/**` is here because these ignore patterns are anchored to this file's directory, so
  // `dist/**` only ever meant the *root* `dist`. Worktrees live under `.claude/worktrees/`, and a
  // worktree is a whole second checkout: once anyone has run a build inside one, a root `eslint .`
  // walks into its `dist/` and reports thousands of errors from a minified bundle — while also
  // quietly linting another branch's `src/` as though it were this one's.
  {
    ignores: [
      'dist/**',
      'dist-ssr/**',
      'dev-dist/**',
      'coverage/**',
      'node_modules/**',
      'public/**',
      '.claude/**',
    ],
  },

  // Base: ESLint core + typescript-eslint (syntactic — fast, no type information needed).
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    linterOptions: {
      // The spec's anti-pattern list bans lint suppressors outright ("NO 'Trust Me' Type
      // Casts or Lint Suppressors: … `eslint-disable`"). `noInlineConfig` makes that
      // structural rather than advisory: an `eslint-disable` comment is ignored, so the
      // underlying rule still reports and the only way to a clean run is to fix the code.
      // If a suppression ever becomes genuinely correct, add a scoped override to THIS
      // file with the reason written down — a decision in the open, not a comment in a hunk.
      noInlineConfig: true,
    },
    rules: {
      // `tsc` already flags genuinely-undefined identifiers with full type awareness, and
      // `no-undef` throws false positives on ambient/DOM types — typescript-eslint's own
      // guidance is to switch it off for TypeScript.
      'no-undef': 'off',
      // Allow intentionally-unused args/vars when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // The other half of the "no trust-me casts" ban. `no-explicit-any` is already an error
      // via the recommended preset; this closes the `@ts-ignore` / `@ts-expect-error` /
      // `@ts-nocheck` escape hatch alongside it.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
    },
  },

  // App source (NOT tests): React rules + type-aware async-safety rules. These need type
  // information, so the parser is pointed at the nearest tsconfig via the project service.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        // TS 6.x is newer than this typescript-eslint's tested range; it still parses
        // fine, so silence the one-time "unsupported version" warning.
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // The FULL react-hooks v7 preset, which is the two classic hook rules plus the React
      // Compiler rule set (`set-state-in-effect`, `purity`, `immutability`, `refs`, …).
      // Those compiler rules are what make the spec's first and most important anti-pattern
      // ban — "NO State Mirroring / Syncing Derived State via useEffect" — something the
      // build catches. Adopting them is only affordable on a greenfield tree: they are
      // enabled here from the first commit precisely so a violation can never accumulate.
      ...reactHooks.configs.recommended.rules,
      // Promote the hook-dependency check to an error: a stale or oversized dep array is a
      // real bug (a missed re-render, or an effect firing every render), not a style nit.
      'react-hooks/exhaustive-deps': 'error',
      // Accessibility linting at the recommended preset's severities (errors).
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Async-safety rules — the spec's "NO Fire-and-Forget Async Logic" ban, enforced.
      // `no-floating-promises` catches the un-awaited call with no `.catch()`;
      // `no-misused-promises` catches an async callback handed to something that runs it
      // synchronously, which is exactly the `forEach(async …)` shape the spec calls out.
      '@typescript-eslint/no-floating-promises': 'error',
      // JSX event handlers are legitimately `async` (React ignores the returned promise),
      // so exempt attributes; still flags a promise passed where a plain callback is run.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
    },
  },

  // Node-side code: the Vite config, the icon generator, and the tests that assert on files
  // on disk rather than on app behaviour.
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,ts}', 'tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Turn off any rule that overlaps with Prettier. MUST stay last EXCEPT for the curly
  // override below.
  prettier,

  // The house style: braceless single-line guards (`if (!x) return;`) are allowed, but a
  // body that wraps onto its own line MUST use braces — so a second statement can never be
  // silently added outside the `if`. `eslint-config-prettier` disables `curly` defensively,
  // so this must be re-asserted AFTER it.
  {
    rules: {
      curly: ['error', 'multi-line'],
    },
  },
);
