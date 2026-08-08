# Studio tab layout — design & implementation record

> **Status:** ✅ COMPLETE — shipped: five grouped, foldable subject groups laid out two-up by
> container query; foldable output groups that summarise their values when shut; and an even 6/6
> studio split with the preview filling the sticky column.

The Studio tab's two configuration panels were flat lists. `SubjectForm` rendered sixteen identical
combo boxes with no hierarchy at all; `OutputConfig` grouped its twenty-odd controls into five named
runs but showed every one of them expanded, always. Stacked in a five-twelfths column they made a
page three viewport-heights tall, beside a sticky column that ended a fifth of the way down it.

This document is the design and the record of how it was arrived at, written against
[issue #1](https://github.com/BootBlock/SpriteGubbins/issues/1). §6 and §7 record what two rounds of
review changed — including several claims in earlier drafts of *this document* that turned out to be
wrong.

---

## 1. What was actually wrong — measured, not asserted

Driven in Edge at 1400 × 950, on the state the app opens in (`CHARACTER`,
`CORE_DIRECTIONAL_VARIANTS`, `componentBudget` 43):

| Measurement | Before | After |
| --- | --- | --- |
| Document height | **3039 px** (3.2 viewport-heights) | **2414 px** (2.5) |
| `Subject Definition` panel | 1252 × 499 px | 1089 × 604 px |
| `Output Configuration` panel | 1639 × 499 px | 1177 × 604 px |
| Form column, total | 2915 px | 2290 px |
| Sticky column, total | **685 px** — selector 93 + gap 16 + preview 576 | **838 px** — 93 + 16 + 729 |
| `PromptPreview` | 576 px (its `max-h-[36rem]` cap) | 729 px |
| Form column with every group folded | *not possible* | **950 px** |
| Controls on screen | 36 — 16 combo boxes, 14 selects, 2 text, 2 number, 1 checkbox, 1 file | unchanged |

**The budget notice is not on screen in that state**, and an earlier draft of this table was wrong to
count it: the default sheet is 43 components against a budget of 43, and `exceedsComponentBudget` is
a strict `>`. The same draft also recorded the sticky column's *width* as its height. Both are
corrected above; §7 records how they were caught.

Five defects followed from those numbers.

1. **No hierarchy in `Subject Definition`.** Sixteen fields, one after another, every row the same
   height and the same shape. Nothing said that `species`/`gender`/`age`/`role`/`setting` describe
   *what the thing is* while `primary_colours`/`accent_colours` describe *how it is painted*. The
   user had to build that model themselves, every visit.
2. **Everything was expanded, always.** Finding one control meant scanning past thirty-five others.
   `OutputConfig` already knew its fields fell into five groups — it just couldn't fold any of them.
3. **The configuration could be edited but not read.** There was no view of the current settings
   short of scrolling the whole panel and reading every control. For a tool whose entire output is
   derived from those settings, that is backwards.
4. **The form column was too narrow for its content, and the preview column too short for its own.**
   The preview was capped at `max-h-[36rem]` (576 px) inside a sticky container with ~838 px of
   viewport available to it — 137 px of height given away while the prompt scrolled internally.
5. **The two columns were wildly out of balance** — 2915 px against 685 px. The sticky column ended
   a fifth of the way down the page; for the 2354 px below that, the right-hand half of the layout
   was empty.

---

## 2. Grounding research

### 2.1 Accordions and disclosure — Nielsen Norman Group

[Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) is the closest
guidance to what this panel needs, and it is prescriptive:

- Accordions help **"when users need only specific pieces of information"** and hurt when the
  audience needs most or all of the content at once.
- **"Allow users to open or collapse multiple sections at a time"** — an exclusive accordion (opening
  one closes the last) is the wrong shape for a settings panel.
- Provide **Expand All / Collapse All**.
- **"Provide appropriate icons (the caret and the plus work best according to our research)"**, and
  make both the heading and the icon clickable.
- **"Avoid hiding any crucial information within the collapsed panels."**

That last rule is the one that decides this design. Every field in `OutputConfig` reaches the
compiled prompt whether its group is open or shut, so a collapsed group that showed nothing would be
hiding something the user is about to paste into a generator. §3.2 answers it directly.

[Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supplies the rule
for choosing defaults: disclose the **frequently-needed** features up front, defer the specialised
ones, and never go more than two levels deep — *"users often get lost when moving between the
levels"*. One level of folding, no nesting.

### 2.2 Field layout — Baymard Institute

[Avoid Extensive Multicolumn Layouts](https://baymard.com/blog/avoid-multi-column-forms) is the
standard citation against side-by-side fields, and its stated exception matters as much as its rule.
Baymard accepts **2–3 inputs per line** where the fields are *"highly associated or can be thought of
as a single coherent entity"*, the user already understands how they connect, and the form reads as
one column overall. The rule's stated cost is that users must *"scan across and down simultaneously"*.

**Where this plan departs from Baymard, and why.** Baymard's evidence is checkout forms: sequential
completion, empty fields, required-field validation, and abandonment as the measured outcome. None of
those apply here. Every field in this studio is **pre-filled from the category's option pool** before
the user arrives, nothing is required, nothing validates on submit, and there is no submit. The task
is *tune and inspect*, not *fill in*. The failure Baymard measures — skipping a required field
because the eye tracked down one column and missed the other — has no analogue in a panel where every
control already holds a value.

So the departure is deliberate and bounded: **two-up only inside a named group of related fields**
(which is the association Baymard requires), only in the panel whose values are short enough to
survive the halved width (§3.3), and never as a split of the panel as a whole.

### 2.3 The inspector idiom — collapsible panels

The pattern this panel actually belongs to is the property inspector: Blender, Unity, Figma,
MuseScore, JavaFX Scene Builder. [Welie's collapsible-panels
pattern](http://www.welie.com/patterns/showPattern.php?patternID=collapsible-panels) is the written-up
form — *"similar to an Accordion but with the possibility to keep entire sections open"*, chosen
because it is *"very space efficient as they are no larger than they have to be"*. That is
**collapsible panels, not an accordion**, and it agrees with NN/g's multiple-open rule.

### 2.4 Disclosure accessibility

[WebAIM](https://webaim.org/techniques/disclosures/) and the surrounding guidance converge on three
requirements:

- Native `<details>`/`<summary>` **already carries the semantics** — the summary exposes button
  behaviour and the expanded state, with no JavaScript and no ARIA to keep in sync.
- **A multi-section accordion needs each control inside a heading**, because screen-reader users
  navigate by pulling up a list of headings; plain buttons make the whole panel invisible to that
  navigation. HTML's content model for `<summary>` is *phrasing content, optionally intermixed with
  heading content*, so `<summary><h3>…</h3></summary>` is valid and gives both.
- **Never put an interactive control inside `<summary>`** — the summary *is* the control.

### 2.5 Sticky section navigation — considered, rejected

Jump-link rails ([PatternFly](https://www.patternfly.org/components/jump-links/design-guidelines/),
[Red Hat](https://ux.redhat.com/elements/jump-links/guidelines/)) are the other way to make a long
settings page navigable. Rejected here: with the folding in §3 the whole form fits in roughly one and
a half screens, and a rail would consume horizontal space in the column that has least of it. The
section headers *become* the navigation. Expand/Collapse-all covers the rest.

---

## 3. The design

### 3.1 One idea per panel, chosen by what the panel contains

The two panels have opposite problems, so they get opposite treatments.

| | `Subject Definition` | `Output Configuration` |
| --- | --- | --- |
| What its fields are | 16 free-text combo boxes, values are short prose — `Cybernetic Cyborg`, `Athletic & Slender` | ~20 controls, values are long identifiers — `CORE_DIRECTIONAL_VARIANTS (43 components)` |
| How often they change | Every new subject: this **is** the creative work | Two of five carry a decision every sheet; the rest have defaults that usually stand |
| Therefore | **Group and densify** — a two-up grid inside each group | **Fold** — the groups whose defaults usually stand start shut |
| Height, before → after | 1252 → 1089 px | 1639 → 1177 px |

Both panels get collapsible groups (consistency, and the ability to focus), but the *defaults* differ
because the content does. Densifying `OutputConfig` would truncate its values; folding
`SubjectDefinition` by default would hide the primary task.

### 3.2 Collapsed means summarised, not hidden

**The single most important decision in this design.** A collapsed group shows its current values
beneath its own heading:

```
▸  PROJECTION & CAMERA
   THREE_QUARTER_TOPDOWN · 35° · THREE_CLASSIC
▸  RIGGING
   POSE_LIBRARY
▸  CONTINUITY ACROSS SHEETS
   no identity lock
```

Three things follow.

- It answers NN/g's *"avoid hiding crucial information"* head on. Folding hides the **controls**, not
  the **configuration** — and since every one of these values reaches the compiled prompt regardless,
  nothing about the output becomes unknowable by folding.
- The collapsed state is **more** scannable than the expanded one. Five lines tell you the whole
  output configuration; expanded, the same information is twenty controls and 1600 px of scrolling.
  Defect 3 in §1 is fixed by folding, not despite it.
- The digest has to track the *visible settings* exactly, including the conditional ones — the rig
  geometry only exists for `CUTOUT_RIG`, the primary facing only when the mode splits into runs. That
  is a pure function of `OutputConfig`, so it goes in `src/utils/` with tests that pin both branches.
  Controls that *act* rather than *hold* — `IdentityPaletteCapture` — are deliberately absent: its
  whole effect lands in the identity lock, which the digest already carries.

**The digest gets its own line and the panel's whole width, clamped to two.** It shared the heading's
line in the first implementation, right-aligned and `truncate`d, and that was wrong twice over: the
render-style digest is 111 characters and lost its last two identifiers *at the app's widest layout*
— in the group that started folded — while short digests hugged the right rail and long ones ran from
the left, so adjacent rows aligned to nothing. On its own line it fits whole down to a 264 px panel,
measured, and the values line up under the heading.

**Every value is bounded at 48 characters**, and that is what makes "fits whole" true of a *filled-in*
studio rather than only of the defaults. Free text is everywhere here — sixteen unfiltered combo
boxes, a socket list, and an identity lock that `withPaletteSegment` appends a whole palette to — and
the first version simply passed it through, so a 600-character lock or a pasted paragraph crowded
every other value in its group out of the two lines. The limit is 48 because the longest string in
any shipped pool is 41, so nothing the app itself offers is ever cut, and what is cut is always text
a user typed, where the opening words identify it. `line-clamp-2` stays as the backstop for a group
of five bounded values, which can still exceed two lines together.

Two more rules keep it honest at the margin. Within a digest the **short categorical values lead and
free text trails**, so what a long value costs is the part with most left to guess from — this is why
`continuityDigest` names the manifest before the identity lock. And `NO_COMPONENT_BUDGET` is `0`
meaning *uncapped*, so the sheet digest says **`uncapped`** — not `budget 0`, which states the
opposite, and not "no budget", which reads in English as *no allowance* and restates the same
misreading in words.

The digest is shown **only while collapsed**, by not rendering it when open rather than hiding it in
CSS. It is also the summary's **description, not its name**: `aria-hidden` keeps it out of
name-from-content and `aria-describedby` puts it back, so the control announces as "Render style,
collapsed, button" and *then* reads its values, instead of six identifiers ahead of the state.

### 3.3 `Subject Definition`: five category-neutral groups, two-up

The sixteen `SUBJECT_FIELD_KEYS` are the same sixteen slots in all five categories, but **their
labels are not**. So each heading has to be true of the **slot** in *every* category — and the table
below carries all five columns for a reason: an earlier draft checked only BUILDING and ITEM, and
three of its five headings were false in the ones it skipped. `clothing` under "Surface & detail" was
the worst of them: OBJECT's is *Mounting / Framework* (a floor-bolted frame — structure, not
surface), and ITEM's is *Scabbard / Holster*, whose own tooltip says it is emitted as a separate
component.

| Group | Keys | CHARACTER | CREATURE | OBJECT | ITEM | BUILDING |
| --- | --- | --- | --- | --- | --- | --- |
| **Identity & context** | `species`, `gender`, `age`, `role`, `setting` | Species · Gender · Age · Role · Setting | Creature Class · Form Variant · Vitality · Behaviour · Habitat | Object Category · Operational Status · Tech Era · Game Function · Environment | Item Type · Rarity · Condition · Purpose · Art Style | Structure Type · Occupancy · Era · Building Role · Biome |
| **Form & structure** | `build`, `silhouette`, `anatomy`, `additional_anatomy` | Build · Silhouette · Anatomy Base · Additional Anatomy | Mass & Frame · Spines & Silhouette · Anatomy Base · Extra Appendages | Form Factor · Hard Surfaces · Structure Base · Deployable Modules | Weight & Size · Blade Profile · Assembly Base · Attached Attachments | Building Scale · Roof & Framework · Assembly Base · **Structural** Appendages |
| **Features & fittings** | `face_head`, `clothing`, `worn_details` | Face, Hair & Head · Clothing / Armour · Integrated Worn Details | Mandibles & Sensory · Harness / Augments · Biological Marks | Interface Screen · Mounting / Framework · Utility Markings | Grip & Pommel · Scabbard / Holster · Runes & Engravings | Entrance & Facade · Awning & Addons · Facade Details |
| **Colour & materials** | `primary_colours`, `accent_colours`, `materials` | Primary · Accent · Materials & Surfaces | Primary · Accent · Surface Shell | Primary · Accent · Material Plating | Primary · Accent · Core Material | Primary · Accent · Construction Materials |
| **Exclusions** | `exclusions` | Explicit Exclusions — identical in all five |  |  |  |  |

Five groups, sixteen keys, each exactly once — pinned by a unit test.

Three placements are the ones worth arguing:

- **`face_head` leads *Features & fittings*, not *Form & structure*.** OBJECT's slot is *Interface
  Screen*, which is neither form nor structure. What is true in all five is that it is the **focal
  feature** — every tooltip says so in its own words: "the smallest piece and the most looked at",
  "the head carries the threat signal", "the part the eye goes to first", "the end a character
  actually holds", "the entrance is the interaction point".
- **`additional_anatomy` sits with `anatomy`, not with `exclusions`.** It is the only one of the
  sixteen with consequences past the prompt text — it filters the sheet-contents choices and feeds
  the component count the budget notice, the atlas calculator and the quantiser all read. "Additions
  & exclusions" paired it with the negative field on *adds versus subtracts*, which is a pun rather
  than a task, and it put the control that changes the component count as far as possible from the
  `Sheet` group whose numbers it changes.
- **The group is *Colour & materials*, not *Palette*.** "Palette" already means a bounded colour
  count in three places a user meets — `RenderStyleFields`' own *Palette Limit* one panel down, the
  quantiser's, and the `Palette:` line the identity lock carries. `materials` belongs with the
  colours besides: every category's tooltip for it describes how light reads off the surface, which
  is the same job the two colour fields do.

Per-category group headings were considered and rejected: twenty-five more strings to keep true, for
a distinction the reader does not need, when one category-neutral set is honest for all five.

**Display order changes; the prompt does not.** `generatePrompt` substitutes every field by key into
`PROMPT_TEMPLATE` (`for (const key of SUBJECT_FIELD_KEYS) values[key.toUpperCase()] = subject[key]`),
so the order fields appear on screen has no bearing on the compiled text. Verified by reading the
compiler, and the existing `promptCompiler` tests hold it. The panel therefore no longer reads in the
template's §1 order, which is a deliberate trade: grouping by the task the user is doing is the whole
point of the change, and the template's order is an artefact of how the prompt argues its case.

**Two-up inside a group**, via a **container query** rather than a viewport breakpoint. The threshold
is a property of the *panel's* width, not the window's — the same panel is full-width when the
layout stacks and half-width when it doesn't, and only its own measurement knows which. `@container`
on the grid's wrapper, `@[34rem]:grid-cols-2` on the grid: below 544 px of panel the fields stay in
one column, above it they pair. Measured across a viewport sweep, two-up engages at 620 px stacked,
drops out between 1024 and 1240 px where the layout is two columns but the form column is narrow, and
returns at 1244 px.

**The narrowest a field gets is 264 px, and the longest option in the whole pool does not fit it.**
`Dark Stained Wood & Vermilion Red #EA580C` needs 291 px, so its hex tail is clipped inside the input
at 1244–1920 px — an earlier draft of this section claimed nothing clipped, having checked the
default values rather than the longest ones. It is a real cost and it is accepted rather than fixed,
because every way out is worse: raising the threshold to fit 291 px means the *desktop* layout never
pairs at all (the form column's content box maxes out at 564 px, and 2 × 291 + 16 needs 598), and
widening the form column to 7/12 buys it by narrowing the prompt the user has to read. It is one
option in 557, it is a `<input>` whose value scrolls on focus, and the identifying words are the ones
still visible. §5 records it as a known trade.

Ten rows instead of sixteen (3 + 2 + 2 + 2 + 1). Four of the five groups hold an odd number of
fields, so a lone trailing field spans the whole row rather than leaving a 270 px void beside it,
which reads as a control that failed to render.

**The category selector stays above all five groups**, separated by a hairline rule. It is not a
sixteenth field and must not read as one: switching it resets every field below it and swaps the
whole option vocabulary, so it governs the groups rather than belonging to one.

### 3.4 `Output Configuration`: fold the groups whose defaults usually stand

Single column throughout — its values are long identifiers and halving the width would truncate them.

Defaults are NN/g's frequency rule, applied to **what the defaults leave you needing to change**.
That phrasing matters, because the obvious phrasing is wrong: an earlier draft split these on "per
sheet versus once per project", and **there is no project**. `useOutputStore` initialises from
`DEFAULT_OUTPUT_CONFIG` with no persistence, and a preset or a history entry is restored only when
the user explicitly opens one — so every setting here is decided on *this* visit, and a split
justified by carry-over was describing a persistence model the app does not have.

| Group | Default | Why |
| --- | --- | --- |
| **Sheet** | open | Contents, count, key colour and canvas. Nobody's sheet is the default sheet. |
| **Render style** | open | The only control in either panel that adds and removes whole *sections* of the template — the pixel-discipline block, its painted alternative, and an audit clause. It changes more of the compiled prompt than anything but the sheet contents, and folding the biggest block on the page was tempting for exactly the wrong reason. |
| **Projection & camera** | collapsed | The defaults are the common case, and choosing a projection moves the elevation with it. |
| **Rigging** | collapsed | Three of its four controls do not exist outside a cut-out rig. |
| **Continuity across sheets** | collapsed | The identity lock is written *after* sheet one is accepted, so on arrival the group is inert and its digest says so. It is also the tallest of the five, carrying the palette-capture drop zone and its explanation. |

The `Technical Directives` badge in the panel header is dropped to make room for the expand/collapse
control. It carries no information the panel title doesn't.

### 3.5 Expand all / Collapse all

NN/g's explicit recommendation, and with three groups folded by default a user who wants everything
would otherwise click three times. One control per panel, scoped to that panel's own groups, labelled
by what it will do (`Expand all` when anything is folded, `Collapse all` when everything is open).

It sits in the panel header, **outside** the `<summary>` elements (§2.4), and it is styled as the
app's existing secondary button — the one `PresetRenameForm`, `HistoryFooter` and the quantiser's
scale candidates already share. A quieter uppercase variant was tried first and read as a disabled
label, not least because it sat in the slot the non-interactive `Technical Directives` badge vacated.

Collapse-all is also the answer to how short this page can get: every group folded measures **950 px**
of form column, against 2915 px before the change, and one click restores any of it.

### 3.6 Rebalance the columns, and let the preview fill its height

- The split moves **5/12 + 7/12 → 6/12 + 6/12**. The form column needs ≥544 px for the two-up
  threshold to ever trigger; the preview gives up ~95 px of width and gets 153 px of height back.
- The sticky column becomes a **flex column capped at the viewport** (`lg:max-h-[calc(100dvh-7rem)]`),
  and `PromptPreview` grows into whatever is left rather than stopping at `max-h-[36rem]`. The
  `<pre>` already scrolls internally, so this is purely more prompt visible at once. Below `lg` the
  36 rem cap stays — a 900 px-tall prompt box on a phone is not an improvement.
- **The column sets no `gap`, and its children space themselves.** This is the one non-obvious part.
  `ComponentBudgetNotice` always renders its live region and makes only the *contents* conditional,
  because a region added at the same moment as its text is not reliably announced. Under the old
  block container that empty element was free — its margins collapsed through it, which its own
  comment said. A flex `gap` does not collapse: it is charged either side of a zero-height item, so
  the quiet case, which is the normal one, paid twice for a notice that was not there. The spacing
  moved onto the notice and the preview instead.
- With the notice showing, the flexbox shrinks the preview to fit. No hand-tuned `calc()` has to know
  whether it is on screen.

### 3.7 Motion — two omissions, both on measurement

The caret's rotation is the whole of the motion on a disclosure. Two alternatives were tried and
dropped, and the second is the more instructive.

**A height transition is unsafe here.** The modern recipe (`interpolate-size: allow-keywords` plus a
`block-size` transition on `::details-content`) requires `overflow: hidden` on that pseudo-element.
That would **clip the combo box's suggestion list in the no-popover fallback path** —
`useAnchoredSurface` deliberately leaves the un-lifted list positioned inside the panel for browsers
without `showPopover()`, and a new clipping ancestor would break exactly that path. The polish is not
worth a regression in the fallback.

**A fade on the content does not replay, contrary to what an earlier draft of this document claimed.**
The reasoning was that a `content-visibility: hidden` subtree resets its animations, so an
`animate-fade-in` on the always-mounted content would run afresh on every open with no state at all.
Measured in Edge and in Chromium — both of which report `CSS.supports('selector(::details-content)')`,
so both apply the user-agent rule the claim rests on — a keyframe animation on a child of a
`<details>` fires `animationstart` **once**, and while the group is shut the element still reports a
finished animation. Rendering state there is preserved, not reset. An animation that plays on first
mount and never again is worse than none, so the fade was removed rather than documented.

---

## 4. Implementation

### 4.1 New files

| File | What it is |
| --- | --- |
| `src/constants/subjectGroups.ts` | `SUBJECT_FIELD_GROUPS`: ordered `{ id, heading, defaultOpen, keys }`, covering all sixteen keys once. |
| `src/constants/subjectGroups.test.ts` | Coverage: every key exactly once, no duplicates, no strays, namespaced ids, and every key defined in all five categories. |
| `src/stores/useSectionStore.ts` | `openSections: Record<string, boolean>` + `setSectionsOpen(ids, open)`. Session-lived. |
| `src/components/common/CollapsibleSection.tsx` | The disclosure primitive: `<details>`/`<summary><h3>`, caret, digest-when-collapsed, store-backed. |
| `src/components/common/CollapsibleSection.test.tsx` | Semantics, digest visibility, toggling, store persistence. |
| `src/components/common/SectionToggleAll.tsx` | The expand/collapse-all button for a set of section ids. |
| `src/utils/studioDigests.ts` | The six pure digest functions — one per output group, one over a subject key list. |
| `src/utils/studioDigests.test.ts` | Both branches of each conditional group; uncapped budget; empty subject fields. |
| `src/components/studio/SubjectForm.test.tsx` | Every category still renders all sixteen of its fields, each inside its group. |

### 4.2 Changed files

| File | Change |
| --- | --- |
| `src/components/tabs/StudioTab.tsx` | 6/12 + 6/12; the sticky column becomes a capped flex column. |
| `src/components/studio/SubjectForm.tsx` | Renders `SUBJECT_FIELD_GROUPS` as collapsible sections with a two-up container-query grid; gains `SectionToggleAll`. |
| `src/components/studio/OutputConfig.tsx` | `FieldGroup` replaced by `CollapsibleSection`; badge → `SectionToggleAll`; per-group defaults and digests. |
| `src/components/studio/PromptPreview.tsx` | `max-h-[36rem]` → capped below `lg`, flex-grow above it; carries its own top margin now the column has no `gap`. |
| `src/components/studio/ComponentBudgetNotice.tsx` | The notice carries its own top margin, and its comment about collapsing margins is corrected — see §3.6. |
| `src/types/ui.ts` | `SectionDefinition` — a section's id and default state declared together, so the disclosure and the expand-all control read the same default. |
| `src/types/subject.ts` | `CategoryDefinition`'s doc no longer claims its field array is display order; `SUBJECT_FIELD_GROUPS` decides that now. |
| `src/index.css` | Unchanged. Every utility this needed already existed; no new token was required. |
| `docs/todo/studio-layout.md` | This document → `✅ COMPLETE`, moved to `docs/todo/done/`. |

`FieldGroup` inside `OutputConfig.tsx` is **deleted**, not left beside its replacement — pre-1.0
policy: replace what you supersede.

### 4.3 Structural constraints this must respect

- **Under 150 lines per file.** Every file this change writes or touches stays inside it.
- **Atomic store selectors.** `useSectionStore((s) => s.openSections[id])`, never the whole store.
- **No token bypass.** Every colour and motion value from `index.css`; the caret uses the same
  `transition-transform duration-200` idiom as `ComboBox`'s chevron.
- **Purity.** Digests are plain functions of their arguments, in `src/utils/`, with tests.
- **The section store is session-lived on purpose.** Persisting folding state across reloads would
  mean a new storage surface beside the SQLite/OPFS layer, for a preference nobody asked for. YAGNI.
  Surviving a tab switch (which unmounts the view — `App.tsx` renders only `VIEWS[activeTab]`) is the
  behaviour that actually matters, and a store gives that.
- **Section ids are namespaced** — `subject:identity`, `output:sheet` — because both panels write
  into one flat record and a bare `sheet` colliding with something later would silently link two
  unrelated disclosures.
- **The `<details>` is controlled.** `open` comes from the store and `onToggle` writes back, so the
  store stays the single source of truth and the button state, the digest and the caret cannot
  disagree with the element. It also means Chromium's find-in-page auto-expansion — which opens a
  `<details>` without any click — is recorded rather than silently reverted on the next render.
- **The caret's hover group must be *named*** — or, as shipped, must not be a group at all: the caret
  reads `isOpen` from the store directly, the way `ComboBox`'s chevron reads its own state.
  `SubjectForm` carries `group/panel` and warns why: Tailwind's `group-hover:` matches *any* `group`
  ancestor, so an unnamed group inside a panel would fire from a pointer anywhere in that panel.
- **Each group's fields keep a programmatic group name.** The `<fieldset>`/`<legend>` the old
  `FieldGroup` used cannot survive — a `<legend>` may not live inside a `<summary>`, and a heading is
  what screen-reader navigation actually needs. But dropping the fieldset outright would leave forms
  mode announcing "Palette Limit, combo box" with nothing tying it to Render style, so the content is
  a `<fieldset aria-labelledby>` pointing at the heading: both affordances, one visible label.

### 4.4 Verification

The full gate — `type-check`, `lint`, `test:run`, `build`, `format` — plus:

- **Drive it in Edge** at 1400 × 950, 1024 × 900 and 480 × 900: measure the document height, confirm
  the two-up grid engages and disengages at the container threshold, and confirm the preview fills
  the sticky column.
- **Keyboard-only**: Tab to a `<summary>`, Enter/Space to toggle, Tab into the revealed fields, and
  through a combo box — the disclosure must not trap or skip focus.
- **Heading navigation**: the five group headings must appear as `h3`s under each panel's `h2`.
- Then `/auto-review high`, and the adversarial UI/UX review the issue asks for.

---

## 5. What this plan explicitly does not do

- **No new persistence.** Folding state does not survive a reload.
- **No jump-link rail** (§2.5).
- **No height animation on the disclosure** (§3.7).
- **No change to the compiled prompt.** Not one character. The compiler is untouched, and its tests
  are the check.
- **No change to any field, option, tooltip or default value.** This is a layout change; the
  inventory the specification pins is exactly as it was.
- **No per-field width metadata.** Making individual output fields half-width where their values
  happen to be short was considered and rejected: it needs per-field tuning that drifts the moment an
  option string grows, and it buys two rows.
- **No per-group randomise.** `Randomise` stays one button over the whole subject.

**Two known trades, stated so they are not mistaken for oversights:**

- **The longest option in the pool clips inside its input** once the fields pair up — §3.3. Fixing it
  costs either the pairing itself or the width of the prompt preview.
- **Nothing outside the Studio tab was touched**, including two pre-existing faults the review surfaced
  in passing: the header's action row overflows below 320 CSS px (WCAG 1.4.10 asks for 320, where it
  is clean), and `ComboBox` opens its list on `focus` only, so clicking a field that already has focus
  after an Escape does not reopen it. Both belong in their own issues.

---

## 6. Plan review — what a read-through changed

The issue asks for the plan to be read back and its findings fixed before implementation. Six things
came out of that pass, recorded here rather than silently folded in.

1. **`subjectDigest.ts` was a file too far.** The subject digest is a `map`/`filter`/`join`; a
   dedicated module and test file for it is the abstraction soup the structural laws ban, while the
   output digests genuinely need conditional logic. Merged into one `studioDigests.ts` — "the
   digests a collapsed studio section shows" is one thing, and it keeps the two halves' separator and
   truncation identical by construction.
2. **The uncapped component budget would have printed a lie.** `NO_COMPONENT_BUDGET` is `0`, so a
   naive digest reads `43 · 0 · MAGENTA_FF00FF` for a sheet with *no* cap. Called out in §3.2 and
   pinned by a test.
3. **The category selector had nowhere to stand.** The original plan grouped sixteen fields and left
   the seventeenth control floating above them with no stated relationship. §3.3 now says what it is
   and why it sits outside the groups.
4. **Nothing guarded the change's worst failure mode.** A grouping that omits a key drops a field
   from the UI *silently* — the compiler still emits it, so the prompt looks right and the control is
   simply gone. `subjectGroups.test.ts` catches it at the data level and the new
   `SubjectForm.test.tsx` catches it at the render level, across all five categories.
5. **The `<details>` had no stated control model.** Left unsaid, this is the kind of thing that ends
   up half-controlled — a store that only hears about clicks, and a caret that disagrees with the
   element after a find-in-page expansion. §4.3 pins it.
6. **The unnamed-`group` trap was one edit away from being re-introduced.** `SubjectForm` carries a
   comment explaining why its hover group is named; a caret using a bare `group` inside it would have
   walked straight back into it. §4.3 pins that too.

---

## 7. Adversarial review — what the second pass changed

The issue asks for the implementation to be reviewed by multiple adversarial reviewers and every
finding fixed. Eight ran over the shipped diff — four on the design (visual, accessibility,
information architecture, responsive/edge-case) and four on the code (CLAUDE.md compliance,
bug/logic, and the two machine-artefact lanes). Most of what they found was in the design, and three
of the findings were against **this document**.

**Four defects in the shipped code.**

1. **`first:border-t-0` never matched in `OutputConfig`.** The five `<details>` were direct children
   of the panel, whose first child is the header — so no group was ever `:first-child` and the Sheet
   group drew a second rule 8 px under the header's. They now sit in their own container, as the
   subject panel's already did.
2. **A flex `gap` on the sticky column charged twice for a notice that was not there.** §3.6 —
   `ComponentBudgetNotice`'s always-present, usually-empty live region was free under a block
   container and is not under flex.
3. **The capped sticky column had no floor and no scroll region, so it clipped the Copy Prompt
   button.** `lg:flex-1 lg:min-h-0` let flex squeeze `PromptPreview` to nothing, and the panel is
   `overflow-hidden` — so what did not fit was not scrolled to, it was gone. Measured at 1280 × 400
   with the budget notice showing: 127 px of the panel's own content clipped and the copy button
   79 px past its edge. Fixed with a `lg:min-h-[20rem]` floor on the preview and `lg:overflow-y-auto`
   on the column, so the cap now means "scroll me", not "hide the rest". Worth noting the direction:
   before this change the column had no cap at all, and below ~700 px of viewport its bottom was
   permanently unreachable — the cap was right, applying it without a scroll region was not.
4. **The sticky column tucked 31 px under the header between 1024 and 1279 px.** The chrome wraps to
   two rows there — 127 px against 77 px above `xl` — and both `lg:top-24` and the new
   `max-h-[calc(100dvh-7rem)]` assumed one height. Both are now written per breakpoint, and the
   target-model select clears the header at every width.

**Three defects in the design, all of them from checking too narrowly.**

3. **Three of five group headings were false in categories the plan never checked.** §3.3's
   justification table had columns for BUILDING and ITEM only, and both contested headings fail in
   OBJECT. The regrouping — *Features & fittings*, *Colour & materials*, `additional_anatomy` beside
   `anatomy`, `Exclusions` alone — is in §3.3, and the table now carries all five categories, which
   is the fix to the method rather than to the symptom.
4. **The digest was clipped in the state the app opens in, and again once a user filled anything in.**
   §3.2. It shared the heading's line, and the render-style digest lost two of its six identifiers at
   the app's *widest* layout. Moving it to its own line fixed the defaults; a second pass with a
   600-character identity lock and a 227-character socket list showed the digests clipping again at
   every width, which is why values are now bounded at the source too. Both falsified the "nothing
   becomes unknowable by folding" claim that is the whole argument for folding.
5. **`Render style` was folded for a reason that does not exist.** §3.4. "Set once per project"
   describes a persistence model this app does not have, and the control it hid changes more of the
   compiled prompt than any other in the panel. It now opens by default and `Continuity across
   sheets` — inert until sheet one is accepted — folds instead.

**Three claims in this document were wrong, and are corrected above rather than quietly dropped.**

6. **§1's right-column row recorded a width as a height** (852 px was the column's *width*; it was
   701 px tall as measured, 685 px on `main`), and counted a budget notice that is not on screen at
   the default 43-against-43. Everything derived from it — "wastes 250 px", "1.55 Mpx²", "thirty-nine
   controls" — was wrong with it. The table now shows before *and* after, measured the same way.
7. **The fade on revealed content does not replay.** §3.7. The claim was reasoned from the
   `content-visibility: hidden` rule and never measured; measured, the animation fires once and the
   element still reports it finished while shut. Removed rather than documented.
8. **Smaller ones, listed so they are not re-found:** "clicking five headers" is three; `<summary>`'s
   accessible name absorbed the whole digest, which `aria-describedby` now carries instead; the
   expand-all button was a fifth spelling of a secondary button the app had already standardised;
   `CategoryDefinition`'s doc still called its field array "display order"; the `Map.get` guard in
   `SubjectForm` was attributed to `noUncheckedIndexedAccess` rather than to `Map`'s own signature;
   and two assertions in `subjectGroups.test.ts` could not fail.

**Three things reviewers raised and this design deliberately did not change.**

- **`SheetSplitRun`'s bare `<details>` is not converted** to `CollapsibleSection`. It folds one run's
  prompt text in a modal list: no configuration to digest, and an open state that has no business
  outliving the modal in a global store. Widening the component to fit would mean optional ids and
  optional digests — speculative generality for one call site.
- **The word "digest" is left doing two jobs** in `src/utils/` — `identityDigest.ts` uses the
  baseline prompt's sense, this uses the ordinary one. `summary` is the obvious rename and it
  collides with the `<summary>` these strings are rendered into. Noted in the module instead.
- **Pre-existing overflow below 320 CSS px** — the Randomise button and the Auto-Sync badge escape
  their panels at 256 px wide. WCAG 1.4.10 asks for 320, where the page has no horizontal scroll at
  all, and this change neither caused nor worsened it. It belongs in its own issue.
