# Security policy

## What this app is, and what that rules out

Sprite Gubbins runs entirely in your browser. There is no server, no account, no telemetry and **no
model API key** — it composes prompt *text* for you to paste into a generator yourself, and makes no
outbound calls to one. Your prompt history, your presets and your interface settings are stored on
your own machine, in SQLite compiled to WebAssembly and persisted to the Origin Private File System,
with a `localStorage` fallback where that is unavailable.

So there is no credential to steal from this project and no data of yours held anywhere but your
own browser. That narrows what a vulnerability here can look like, and it is worth saying what is
left rather than implying there is nothing.

## What is in scope

- **Anything that executes code in a reader's browser** from data they did not author: a prompt, a
  preset file, an imported palette, a sprite sheet, or a value read back out of the database.
- **The service worker.** [src/sw.ts](../src/sw.ts) injects `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Embedder-Policy` onto this origin's own responses, because GitHub Pages sends no
  custom headers. A flaw that let it grant a cross-origin resource an opt-in it should not have, or
  that let it serve one origin's response as another's, is in scope.
- **Stored data crossing an origin.** Anything that lets a page other than this one read the
  database, the presets, or the history.
- **The published site**, https://bootblock.github.io/SpriteGubbins/, and the supply chain that
  builds it: a dependency, a GitHub Action, or the deploy workflow itself.

## What is not

- A prompt this app composes producing artwork you did not want. That is a content defect, and it
  belongs in an ordinary [bug report](https://github.com/BootBlock/SpriteGubbins/issues/new?template=bug_report.yml).
- Anything about the image generators themselves. They are other people's services, and this app
  never speaks to them.
- A finding that needs an attacker to already have your device, your browser profile, or your
  unlocked screen.

## Reporting a vulnerability

**Please do not open a public issue.**

Report it privately through GitHub, from
[the repository's Security tab](https://github.com/BootBlock/SpriteGubbins/security/advisories/new).
Private vulnerability reporting is enabled, so that form goes to the maintainer and to nobody else.

Please include what you did, what happened, which browser and version you used, and the app version
from the About section of the Architecture tab. A proof of concept is welcome. Do not include an API key, a password or
personal data in the report — none of them is needed to describe a finding here.

## What happens next

This is a one-person project, so there is no support contract behind these words. What you can
expect is an acknowledgement when the report is read, a plain answer about whether it is in scope,
and a fix released to the site if it is. Every version is `0.x` and any release may change anything,
so a security fix ships in an ordinary release rather than as a patch to an older one — there are no
supported older versions to patch.

If you would like credit in the release that fixes it, say so and name how you want to be credited.

## Supported versions

Only the version currently deployed at https://bootblock.github.io/SpriteGubbins/. The app is a
progressive web app, so an installed copy updates itself from that same origin.
