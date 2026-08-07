# `docs/todo/` — plan & effort logs

> **Status:** 📘 REFERENCE — defines the status convention for every document in this folder.

These are working documents: phased plans, specifications, backlogs and audits. They are **not**
a description of how the app currently behaves — a plan records what was intended at the time it
was written, which may since have changed.

Because they are long-lived and world-readable, a reader must be able to tell **at a glance**
whether a document still describes live work. A finished plan reads exactly like a live one
unless it says so, and that is how stale guidance gets followed. The status banner exists to
prevent that.

## The rule

Every `.md` file in this folder (including `done/`) **must** begin with a status banner as the
first non-blank line after the `#` heading:

```markdown
# My feature — implementation plan

> **Status:** 🟢 ACTIVE — open backlog; phases 1–2 shipped, phase 3 next.
```

A unit test enforces this ([`tests/docs-todo-status.test.ts`](../../tests/docs-todo-status.test.ts)),
so a missing or misfiled banner fails the build rather than review. It cannot judge whether
"COMPLETE" is *true* — that part is yours.

## The four statuses

| Status | Meaning | Lives in |
| --- | --- | --- |
| `🟢 ACTIVE` | Live work. Someone may pick this up next; the content is expected to be current. | `docs/todo/` |
| `📘 REFERENCE` | The work is done, but the document is deliberately kept as durable reference (a format spec, a feasibility survey and its verdicts). | `docs/todo/` |
| `✅ COMPLETE` | The work shipped. Kept for the design rationale and the record of *why*, not as current guidance. | `docs/todo/done/` |
| `⛔ SUPERSEDED` | Overtaken by later work. Retained for historical context only — **do not** treat as current. | `docs/todo/done/` |

Keep the one-line summary after the dash specific and factual — which phases shipped, what is
next. Don't state a completion date you haven't verified; omit it instead.

## Moving a document

When an effort finishes, change its banner to `✅ COMPLETE` and `git mv` it into `done/` in the
same change. Grep for inbound links first and update them, or the move leaves dangling
references behind.

**Never rewrite a plan's history to match current practice.** A past-tense record of what a
phase actually did is evidence; editing it to name today's command asserts something that never
happened. Correct *live instructions*, and let records stand.

## Non-Markdown files

The rule covers `.md` documents only. Other artefacts kept here for reference — such as
[`sprite-gubbins.html`](sprite-gubbins.html), the original single-file application this project
is a migration of — carry no banner and are not swept by the test.
