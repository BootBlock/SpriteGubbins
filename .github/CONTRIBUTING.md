# Contributing to Sprite Gubbins

Thank you for looking. This page is the short version; the working conventions a change is held to
are in [CLAUDE.md](../CLAUDE.md), and tests enforce many of them.

## Pull requests are not accepted

I am grateful for contributions, and this is not a judgement on any particular one. **Pull requests
from outside the collaborator list are never accepted, whatever they contain.** A workflow closes
each one as it arrives, with a comment saying so, because an immediate answer is kinder than an open
pull request nobody is going to review.

**Open an issue instead.** A short line about the change you want is the most useful thing you can
send:

- [Bug report](https://github.com/BootBlock/SpriteGubbins/issues/new?template=bug_report.yml)
- [Feature request](https://github.com/BootBlock/SpriteGubbins/issues/new?template=feature_request.yml)
- A blank issue is fine for anything else.

Please do not open a public issue for a security problem. [SECURITY.md](SECURITY.md) says what to
do instead.

## Why

Sprite Gubbins is maintained by one person, [@BootBlock](https://github.com/BootBlock), and much of
it is written by AI agents working to the conventions in `CLAUDE.md`. Three things follow from that:

- **The conventions are unusually specific, and they are enforced by tests.** Colours come from
  design tokens, durations come from a six-rung ladder, files stay under 150 lines of code, and
  guidance copy is checked for punctuation and for sentences shared between two controls. A change
  that ignores one of these fails the build rather than review.
- **Work lands through git worktrees on this machine**, one branch per task, verified in a browser
  before it is merged. An incoming branch does not fit that, and reviewing one properly costs more
  than describing the problem and having it done here.
- **Anything an agent posts here says so.** Issue and pull-request bodies written by an agent carry
  a trailer naming the account they were written for. Commits carry a `Co-Authored-By` trailer
  instead.

None of that stops you forking the repository and changing it for yourself — the
[MIT Licence](../LICENSE) says you may. It stops the change coming back this way.

## Running it yourself

```bash
npm install
npm run dev            # http://localhost:5173/SpriteGubbins/
```

Node 24 or newer. The pinned version is in [.nvmrc](../.nvmrc), and it is what CI installs.

The gate every change here has to pass, if you want to hold your own fork to it:

```bash
npm run type-check
npm run lint
npm run test:run
npm run build
npm run format
```

Every push to `main` and every pull request runs the same checks again in
[tests.yml](workflows/tests.yml) — the pull requests being Dependabot's and the
collaborators', which are the ones that exist.

Two rules are worth repeating because the cost of missing them is unrecoverable:

- **This repository is public, and a committed secret is permanent.** No API keys, tokens, private
  addresses or real personal data, in any tracked file — source, tests, fixtures, docs, comments or
  commit messages. A pre-commit hook and a whole-tree scan in CI both look for them, but the rule
  is yours to keep. The app itself handles no model API key by design.
- **The version is `0.x`, so nothing is kept alive for compatibility.** A change replaces what it
  supersedes: rename the symbol and update every call site, delete the retired option, change the
  schema and let an incompatible database be discarded. Shims, aliases and migrations are rejected
  on sight until 1.0.0.

## What makes a good issue

A short description of what you did, what happened, and what you expected instead. Which browser,
if the app misbehaved. The sprite sheet, if the quantiser did something odd to it — a real sheet
says more than a description of one. For a prompt-text change, the vendor documentation the new
wording follows.

## What tends not to get built

Reformatting for its own sake, new dependencies without a case for them, abstraction layers nothing
asks for yet, and anything that adds an outbound model call or a credential field — the app
composes prompt *text* for you to paste elsewhere, and it has deliberately never had a credential
surface.

## Licence

The repository is under the [MIT Licence](../LICENSE). Fork it, change it, ship it.
