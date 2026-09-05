<!--
Thank you for the change. The working conventions are in CLAUDE.md, indexed in AGENTS.md, and the
short version for contributors is in .github/CONTRIBUTING.md.

Delete any section below that does not apply. A one-line fix does not need a long form.
-->

## What this changes

<!-- What the reader gets that they did not have before, or what stops being wrong. -->

## Why

<!-- The defect, the issue number, or the reason this is worth doing. Link the issue: Closes #123 -->

## How it was verified

<!--
Which of these you ran, and what happened. "All green" is fine if it is true.

  npm run type-check
  npm run lint
  npm run test:run
  npm run build
  npm run format

If the change has a runtime surface, say how you drove it in a browser — CI never opens one.
-->

## Checklist

- [ ] No API key, token, password or personal data is in the diff. `git diff --cached` was read.
- [ ] Colours, durations and easings come from the design tokens in `src/index.css`, not from
      literals or ad-hoc Tailwind palette classes.
- [ ] New behaviour is covered by a test that would have caught the original problem.
- [ ] Anything the change makes untrue is updated in the same commit: call sites, types, tooltips,
      constants and the paragraph of documentation that now describes the old behaviour.
- [ ] No compatibility shim, alias, dual code path or data migration. The version is `0.x` and a
      change replaces what it supersedes.
