# Contributing to Sprite Gubbins

Thank you for looking. This page is the short version; the rules a change is actually held to are
in [CLAUDE.md](../CLAUDE.md), with a one-page index in [AGENTS.md](../AGENTS.md). Read whichever
suits you before opening a pull request — both describe the same project and the same gate.

## How this repository is worked on

Sprite Gubbins is maintained by one person, [@BootBlock](https://github.com/BootBlock), and much of
it is written by AI agents working to the conventions in `CLAUDE.md`. That has two consequences
worth knowing up front:

- **The conventions are unusually specific, and they are enforced by tests.** Colours come from
  design tokens, durations come from a six-rung ladder, files stay under 150 lines of code, and
  guidance copy is checked for punctuation and for sentences shared between two controls. A change
  that ignores one of these fails the build rather than review.
- **Anything an agent posts here says so.** Issue and pull-request bodies written by an agent carry
  a trailer naming the account they were written for. Commits carry a `Co-Authored-By` trailer
  instead.

## Opening an issue

Use one of the two forms if you have met the app rather than the codebase: a
[bug report](https://github.com/BootBlock/SpriteGubbins/issues/new?template=bug_report.yml) or a
[feature request](https://github.com/BootBlock/SpriteGubbins/issues/new?template=feature_request.yml).
A blank issue is fine for anything else.

Please do not open a public issue for a security problem. [SECURITY.md](SECURITY.md) says what to
do instead.

## Making a change

```bash
npm install
npm run dev            # http://localhost:5173/SpriteGubbins/
```

Node 24 or newer. The pinned version is in [.nvmrc](../.nvmrc), and it is what CI installs.

Before you open a pull request, run the whole gate. All four have to be clean, and `format` is what
stops the next diff being full of reflowed lines nobody wrote:

```bash
npm run type-check
npm run lint
npm run test:run
npm run build
npm run format
```

Every push to `main` and every pull request runs the same checks again in
[tests.yml](workflows/tests.yml), so a red pull request is telling you something real.

Two rules are worth repeating here because the cost of missing them is unrecoverable:

- **This repository is public, and a committed secret is permanent.** No API keys, tokens, private
  addresses or real personal data, in any tracked file — source, tests, fixtures, docs, comments or
  commit messages. A pre-commit hook and a whole-tree scan in CI both look for them, but the rule
  is yours to keep. The app itself handles no model API key by design.
- **The version is `0.x`, so nothing is kept alive for compatibility.** A change replaces what it
  supersedes: rename the symbol and update every call site, delete the retired option, change the
  schema and let an incompatible database be discarded. Shims, aliases and migrations are rejected
  on sight until 1.0.0.

## What tends to get merged

Small, complete changes with a test that would have caught the original problem. A fix at the level
the defect lives at, rather than at the call site that reported it. Prompt-text changes that can
say which vendor documentation they follow.

## What tends not to

Reformatting for its own sake, new dependencies without a case for them, abstraction layers nothing
asks for yet, and anything that adds an outbound model call or a credential field — the app
composes prompt *text* for you to paste elsewhere, and it has deliberately never had a credential
surface.

## Licence

By contributing you agree that your work is licensed under the [MIT Licence](../LICENSE), the same
as the rest of the repository.
