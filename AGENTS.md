# Agent instructions

This file is the cross-agent (AGENTS.md) entry point. The full working conventions live in
[CLAUDE.md](CLAUDE.md) — **read it before making changes.** This file is deliberately a pointer,
not a copy: it repeats in full only the rules whose cost of being missed is unrecoverable, and
links the rest.

The **specification** — what to build, in five phases, with the complete field/option/tooltip
inventory — is [docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md).

## Mandatory rules — the complete list

Every rule below is mandatory. The ones marked with an emoji appear on this page; the rest are one
click away and are **equally binding** — "I only read AGENTS.md" is not a defence. Every `##`
section of [CLAUDE.md](CLAUDE.md) has a row here, and
[tests/agents-rule-table.test.ts](tests/agents-rule-table.test.ts) fails the build when one does
not — which is why each row links the section it stands for.

| Rule | Where |
| --- | --- |
| All work happens in a git worktree | 🌿 below, [CLAUDE.md](CLAUDE.md#all-work-happens-in-a-git-worktree-mandatory) |
| Work is not done until it has landed — commit, merge, remove the tree | 🏁 below, [CLAUDE.md](CLAUDE.md#work-is-not-done-until-it-has-landed-mandatory) |
| No secrets in the repository | 🔒 below, [CLAUDE.md](CLAUDE.md#no-secrets-in-the-repository-mandatory) |
| Public-repository hygiene | 🌐 below, [CLAUDE.md](CLAUDE.md#public-repository-hygiene-mandatory) |
| Attribution on GitHub issues and PRs you write | ✍️ below, [CLAUDE.md](CLAUDE.md#agent-attribution-on-github-content-mandatory) |
| Do the whole fix, never the cheap one | 🎯 below, [CLAUDE.md](CLAUDE.md#do-the-whole-fix-never-the-cheap-one-mandatory) |
| Reconcile an issue's labels whenever you touch it | [CLAUDE.md](CLAUDE.md#reconcile-an-issues-labels-whenever-you-touch-it-mandatory) |
| Close the issue you actioned; a comment on a closed one does not reopen it | [CLAUDE.md](CLAUDE.md#close-the-issue-you-actioned-mandatory) |
| Design tokens, not hard-coded colour/motion values | ⚠️ below, [CLAUDE.md](CLAUDE.md#design-tokens-are-mandatory-where-one-exists) |
| Every control ships with guidance — `Tooltip` for a value, `ControlTooltip` for an action | [CLAUDE.md](CLAUDE.md#every-control-carries-guidance-and-there-are-two-ways-to-show-it) |
| Prompt text is a contract — where the words live, and what may never be stated twice | [CLAUDE.md](CLAUDE.md#prompt-text-is-the-product-and-it-is-written-to-rules) |
| No backwards compatibility, shims or data migrations before `1.0.0` | 🚧 below, [CLAUDE.md](CLAUDE.md#no-backwards-compatibility-before-100-mandatory) |
| The structural laws — <150 lines, one thing per file, SoC by directory, YAGNI, DRY, no stubs | [CLAUDE.md](CLAUDE.md#architecture-the-specs-structural-laws) |
| The banned patterns, and which ones the build catches | [CLAUDE.md](CLAUDE.md#banned-patterns-and-which-ones-the-build-catches) |
| Cross-origin isolation — what it is for, and what actually depends on it | [CLAUDE.md](CLAUDE.md#cross-origin-isolation-and-what-actually-depends-on-it) |
| Accessibility wiring — roles, labels, live regions, focus | [CLAUDE.md](CLAUDE.md#accessibility-is-not-optional) |
| Anything needing a real sprite sheet takes one of the eight in `test_sprites/` | [CLAUDE.md](CLAUDE.md#the-test-sprite-sheets-live-in-test_sprites-mandatory) |
| Plan docs under `docs/todo/` carry a status banner | [CLAUDE.md](CLAUDE.md#plan-docs-carry-a-status-docstodo) |
| How to verify a change before calling it done | [CLAUDE.md](CLAUDE.md#verifying-a-change) |
| Multi-line commit messages, PR bodies and comments go through a file | [CLAUDE.md](CLAUDE.md#multi-line-text-goes-through-a-file-not-inline-quoting) |

**Adding a section to CLAUDE.md? It belongs in that table too** — and the test says so before a
reviewer has to.

## 🌿 All work happens in a git worktree (mandatory)

Several agents typically work in this repository **concurrently**, and a checkout has exactly one
working tree, one index and one `HEAD` — so two agents sharing it overwrite each other's edits,
stage each other's files into a commit, and disagree about which branch is checked out. None of
that fails loudly; it surfaces as a diff nobody can account for.

**The rule:** before making any change, add a worktree and do the work there. The primary checkout
is for reading, reviewing and integrating — never for edits.

```bash
git worktree add .claude/worktrees/<topic> -b worktree-<topic>
```

One worktree, one branch, one task. Don't adopt a tree another agent is working in, and never
switch the primary checkout's branch to do work. `node_modules` isn't shared between trees, so
`npm install` and run the full gate **inside** the tree you edited. **Never run `git clean -ffdx`**
— the second `-f` removes git's refusal to descend into a nested repository, and takes every other
agent's uncommitted work with it. Full detail, including the three separate exclusions that keep
root-scanning tools out of `.claude/worktrees/`, in
[CLAUDE.md](CLAUDE.md#all-work-happens-in-a-git-worktree-mandatory).

## 🏁 Work is not done until it has landed (mandatory)

A green gate is not a finished task. A change left sitting in a worktree has shipped nothing —
`main` doesn't have it, no other agent can build on it, and the tree holds its branch hostage. The
session ends reporting success and the loss surfaces days later.

**The rule:** the session that does the work also lands it — **before** reporting the task
complete.

```bash
git status --short                        # every ?? line is work too; nothing may be left behind
git add -A && git diff --cached           # then the secrets self-audit on the staged diff
git commit -F <message-file>              # multi-line messages go through a file
git merge worktree-<topic>                # from the primary checkout
git worktree remove .claude/worktrees/<topic>
git branch -d worktree-<topic>
```

Untracked files are the commonest way half a change lands. Committing is not landing — an unmerged
branch is invisible. If `git worktree remove` refuses, the commit step missed something: go and
look, never `--force`. If instead it *fails* naming a path, something still holds a handle inside
the tree — stop the dev server, then `rm -rf` the leftover and `git worktree prune`. Land only your
own tree; other agents' trees are in use. **`main` and the `v*` tags reject a force push and a
deletion**, so a merge that isn't a fast-forward is resolved on your own branch and merged back,
never forced onto `main`. And if the work
genuinely can't land, leave the tree and **say so explicitly**, naming the branch and the blocker —
silence is the banned outcome. Full detail in
[CLAUDE.md](CLAUDE.md#work-is-not-done-until-it-has-landed-mandatory).

## 🔒 No secrets in the repository (mandatory)

This is a **public** repository. Committing a secret is treated as a build-breaking error —
secrets are effectively permanent once pushed (they live in history and may be scraped within
seconds), so the only safe rule is to never let one in.

**Hard rules — these are not negotiable:**

- **Never** write an API key, token, password, secret, private key, certificate, OAuth
  client secret, session cookie, or connection string into any tracked file — including
  source, tests, fixtures, docs, comments, config, and commit messages. Use an obvious
  placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) when an example is genuinely needed.
- **This app never handles a model API key.** It composes prompt *text* for the user to paste
  into a model themselves — it makes no outbound model calls. A change that proposes an API
  key field, an image-generation request, or a proxy is a new architecture, not an increment:
  stop and raise it.
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

## 🌐 Public-repository hygiene (mandatory)

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
  bundle and are read by strangers. Keep them descriptive and neutral.
- **Dependency & IP hygiene.** Don't paste code from sources with an incompatible or unknown
  licence; prefer writing it or using a properly-attributed, licence-compatible dependency.
  Vet new dependencies before adding them and keep the surface minimal. This repo is licensed
  **MIT** (see [LICENSE](LICENSE)) — keep `package.json`'s `license` field consistent with it.
- **Keep the ignore rules tight.** Before committing a new kind of generated or local file,
  confirm it belongs in the repo; if it's a build artefact, local cache, or could contain
  real data, add it to `.gitignore` instead.

## ✍️ Attribution on GitHub content (mandatory)

Anything **you** post or edit on GitHub on the maintainer's behalf must disclose that an agent
wrote it. This covers **every** issue and pull-request **comment**, and every issue/PR
**description or body** you author or edit. Attribution is disclosure, not internal process, so
it always stays — unlike the plumbing that must never leak (see above).

Append it as the **last lines**, after a `---` rule, wording the verb to match what you did
(`actioned` / `opened` / `updated`, and `pull request` in place of `issue`):

```markdown
---
This issue was actioned by an agent on behalf of @BootBlock.
```

Omit it only when GitHub gives you no body to sign (e.g. adding a label); if in doubt, include
it. This does **not** apply to git commit messages — those carry a `Co-Authored-By` trailer
instead. Full detail in
[CLAUDE.md](CLAUDE.md#agent-attribution-on-github-content-mandatory).

**The same visit owes the issue its labels.** Whenever you open, action, comment substantively on
or close an issue or PR, reconcile its **whole** label set from the repository's own list
(`gh label list --limit 200`) — removing what no longer applies as much as adding what now does,
and never inventing a label. `status:` is the one that goes stale: exactly one, or none once the
issue closes. Full detail in
[CLAUDE.md](CLAUDE.md#reconcile-an-issues-labels-whenever-you-touch-it-mandatory).

**And the same visit closes it.** An issue you actioned, whose work has landed, gets closed then
and there — an open issue whose work has shipped is indistinguishable from work still waiting, and
someone will do it again. Comment what you did, then `gh issue close <n>`. Leaving it open needs a
reason, and the reason goes **in that comment**: you actioned only part of it, it tracks children
still open, or it needs a decision that isn't yours. "For visibility" and "the maintainer can close
it" don't count. A **comment on an already-closed issue does not reopen it** — do the extra work
and add a *new* comment; reopening claims the work is outstanding again, so it takes a very good
reason (the fix regressed, or the issue was closed on a false premise). Genuinely new work gets a
new issue linked to the old one. Full detail in
[CLAUDE.md](CLAUDE.md#close-the-issue-you-actioned-mandatory).

## 🎯 Do the whole fix, never the cheap one (mandatory)

Every fix arrives with a cheap version attached — the narrow patch on the one branch that reported
the bug, the guard that suppresses the symptom, the special case that satisfies the failing test.
It is always quicker to write, smaller to review and easier to justify, and it is why the same
defect gets found again a month later wearing a different symptom.

**The rule:** when you decide *how* to fix something — a review finding, a bug you tripped over, a
gap you noticed while working elsewhere — take the correct, complete, root-cause fix. Never choose
an approach because it is quick, easy, or touches fewer files. Fix the cause at the level it lives,
fix every instance rather than the reported one, update every call site, test and doc the change
implies, and delete what it supersedes.

This is **not** a licence for scope creep (complete is measured against the defect, not everything
nearby), **not** a licence for speculative generality (YAGNI still holds — powerful means the cause
is gone, not that the machinery is bigger), and **not** "fix it badly rather than raise it" (if the
correct fix is genuinely too large or needs a decision that isn't yours, say so and leave the
defect documented). What is banned is shipping the narrow version and calling it fixed. Full detail
in [CLAUDE.md](CLAUDE.md#do-the-whole-fix-never-the-cheap-one-mandatory).

## ⚠️ Use design tokens, not hard-coded values

Every colour and motion value in the UI must come from a **design token** in one of the two
`@theme` blocks of [src/index.css](src/index.css) — never a raw hex, `rgb()`/`oklch()` literal, or
an ad-hoc Tailwind palette class. The first block is `@theme static` and holds the ten-stop hue
wheel, which is reached only through `var()`: a plain `@theme` would let Tailwind tree-shake every
stop away, and each surface painted in the view's colour would silently disappear. Unknown Tailwind
utilities **fail silently** too, so verify a new one actually emits CSS. Full table and the four
documented exemptions in
[CLAUDE.md](CLAUDE.md#design-tokens-are-mandatory-where-one-exists).

## 🚧 No backwards compatibility before `1.0.0` (mandatory)

The `version` in [package.json](package.json) is **0.x**. Everything below `1.0.0` is explicitly
unstable — any release may break anything, and users are told to expect that — so **there is no
backwards-compatibility surface to preserve and none may be built.**

A change *replaces* what it supersedes: rename the symbol and update every call site in the same
commit, delete the retired option and let a stored value naming it fall through to its default,
change the DDL and let an incompatible database be discarded. Banned until `1.0.0`: aliases and
forwarding re-exports, `@deprecated` wrappers, dual code paths that read a previous shape,
schema migrations, legacy fixtures proving an old format still loads, and a `v2` left beside an
undeleted `v1`.

Three things are **not** covered by this and stay: guards against *corrupt* storage, support for
the browser a user has today (the localStorage fallback, cross-origin isolation, popover feature
detection), and the verification gate. Full detail, including what happens at `1.0.0`, in
[CLAUDE.md](CLAUDE.md#no-backwards-compatibility-before-100-mandatory).
