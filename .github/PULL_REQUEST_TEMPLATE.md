<!--
STOP — THIS REPOSITORY DOES NOT ACCEPT PULL REQUESTS.

If you are not on the collaborator list, a workflow will close this as soon as you open it. That is
not a judgement on the change; it is the policy, and it holds whatever the change contains.

The route that works is an issue with a short line about what you want changed:

  https://github.com/BootBlock/SpriteGubbins/issues/new/choose

.github/CONTRIBUTING.md says why. Thank you for the offer either way — please send it as an issue.

The rest of this template is for collaborators. The working conventions are in CLAUDE.md. Delete
any section below that does not apply; a one-line fix does not need a long form.
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
