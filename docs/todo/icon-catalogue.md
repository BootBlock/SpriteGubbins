# Icon catalogue — named icon sets drawn sixteen to a sheet

> **Status:** 🟢 ACTIVE — phases 1–2 shipped; phase 3 next.

## 1. What is wrong

An ICON sheet asks for "Core icons ×12: twelve distinct subjects from the stated family". The
generator picks the twelve subjects, so a reader who needs a particular set — a game's action bar,
its bags, its spellbook, its micro-menu — cannot ask for the icons the game has. Nor can they name
the files the quantiser cuts out, since the slots are anonymous.

The use case that drives the change is a cyberpunk MMORPG in the mould of World of Warcraft, whose
action bars, bags, spellbook, emote list and system menu together need several hundred icons drawn
as one family, with prompts pasted into ChatGPT 5.6 Sol.

## 2. Decisions

These were made by the maintainer before any code was written.

1. **The look is chosen per set**: a *full-bleed tile* (the art fills the whole square, backdrop
   included, and the interface adds the frame) or an *isolated mark* (today's sheet: the subject
   alone on the key colour).
2. **Icons are ticked from a shipped catalogue**, and the reader can add entries of their own.
3. **A catalogue entry is an archetype with a look per world**: a game role ("minor healing
   consumable") written once per look family (a red stim-pack auto-injector in cyberpunk, a small red
   potion in fantasy). It covers items and consumables, spells and abilities by damage school, emotes
   and social icons, mounts, pets and professions, and interface and system icons.
4. **Icons are 128 × 128 px.**
5. **Sixteen icons to a sheet, four by four.** A longer list is a series of sheets.
6. **The state and overlay pieces are one sheet of their own, once per set.** Icon sheets carry
   icons only.
7. **Each ticked icon is a named slot**, and therefore a named file in the sprite pack.

Decided during planning, on the rule that the correct option is taken:

- **The quantiser gains a scale-into-cell path for painted sheets (phase 7).** A painted 4 × 4 sheet
  draws each tile at roughly 230 px, and the quantiser never resamples, so without this a 128 px
  file is unreachable for the look the maintainer chose. Pixel-art sheets are untouched.
- **Five look families, every look written.** Worlds within a family differ in mood rather than in
  what an object is, and section 1 of the prompt already carries the mood. A world typed by hand
  that maps to no family falls back to the role, drawn as the stated world would make it.
- **The overlay sheet is not optional.** The maintainer asked for it once per set.

## 3. Where the architecture resists, and the resolution

| # | Resistance | Resolution |
| --- | --- | --- |
| R1 | `SeriesFor = (facings) => SheetSeries` is a static table, and `SHEET_INDEX_RANGE` is computed from it. | `SeriesFor` takes the `SheetSubject` too. `fixed()` and the facing factories ignore it. `SHEET_INDEX_RANGE.max` includes `ICON_SERIES_LONGEST`. Test helpers pass whole-catalogue rosters, so every plan sweep covers every entry. |
| R2 | `SubjectDefinition` is `Record<SubjectFieldKey, string>`. | It gains `icons?: IconRoster`, present exactly when the category declares a roster. It travels through session, history, presets and the library pack inside `subject_json`. `samePosition`, preset search and `sparseSubject` learn it. |
| R3 | Section 1 tells every component to carry the *Applied Overlay*; once overlays leave the icon sheets that is false. | Gate `[IF:CLOTHING_DRAWN_ELSEWHERE]`: the field is drawn by another sheet of the series, and nothing on this one carries it. |
| R4 | Exclusions outrank the inventory's elements, so an emote under "No hand…" would lose its hand. | The exclusion becomes "No hand or figure an icon’s entry does not name", and ICON's exclusion text rescues a figure an entry names. Entries declare `figure`. |
| R5 | ICON's exclusion, guard and audit text cannot see the look. | `SheetPlanFields.backdrop?: 'OWN_SQUARE'`, declared by full-bleed icon sheets, with an `OWN_BACKDROP` gate. |
| R6 | Additional anatomy lands only on sheet 0 of a run series. | The overlay sheet is first, and ICON's *Extra Icons* becomes *Extra Overlay Pieces*. |
| R7 | The quantiser never resamples. | Phase 7: an opt-in `SCALE_INTO_CELL` fit for painted sheets, with a pure area-average resampler. |
| R8 | A 4 × 4 grid of 128 px cells needs a square sheet. | `categoryAspectRatios.ts` binds ICON to `SQUARE_1_1`. |
| R9 | Reader text passes through `cite()`, which throws on an unknown `[SEC:…]`. | Custom entries refuse `[` and `]`. |
| R10 | `sheetIdentity` stringifies the subject, so one tick un-marks every copied sheet. | Key it on the subject without the roster plus the drawn plan's own entries. |
| R11 | Icon Family, What It Signals, Focal Motif and Silhouette Read describe one icon; a mixed roster contradicts them. | Repurpose them as set-level disciplines (§5). |
| R12 | A set accent colour against a per-spell school colour. | The icon sheet's intro: a colour an entry names is that icon's own, and outranks the set's accent for it. |
| R13 | `gradient background` in the Qwen and Stable Diffusion negatives suppresses a full-bleed backdrop. | Drop that term when the plan declares `backdrop`. |
| R14 | The catalogue is hundreds of declarations. | `src/constants/iconCatalogue/` joins `DECLARATION_PATHS` in `tests/module-size.test.ts`. |
| R15 | A neon school colour near a key colour is keyed out. | A test holds every school colour beyond key distance from every key colour, and apart from each other. |

## 4. The catalogue

`src/types/iconCatalogue.ts` declares `ICON_KINDS` (`ITEM`, `SPELL`, `SOCIAL`, `COMPANION`,
`SYSTEM`), `LOOK_FAMILIES` (`FANTASY`, `AGE_OF_STEAM`, `MODERN`, `CYBERPUNK`, `SPACE_OPERA`),
`DAMAGE_SCHOOLS` and `IconCatalogueEntry` (`id`, `role`, `kind`, `group`, `school` for spells only,
`figure`, `states` for a toggle pair, and `looks` for all five families). `src/types/iconRoster.ts`
declares `ICON_LOOKS` (`FULL_BLEED_TILE`, `ISOLATED_MARK`), `CustomIconEntry`, `IconPick` and
`IconRoster`.

The entries live in `src/constants/iconCatalogue/`, one file per group, with `LOOK_FAMILY_OF_WORLD`
keyed by ICON's World & Era options and `ICONS_PER_SHEET` derived from `ICON_GRID_COLUMNS`.

| Family | Worlds |
| --- | --- |
| `FANTASY` | High Fantasy, Grim Dark Fantasy, Medieval Historical, Mythic Antiquity, Feudal East Asia, Mesoamerican Jungle, Cosy Storybook |
| `AGE_OF_STEAM` | Age Of Sail, Victorian Gaslamp, Wild West Frontier, Deep Ocean Voyage |
| `MODERN` | Modern Day, Post-Apocalyptic Salvage |
| `CYBERPUNK` | Near-Future Cyberpunk |
| `SPACE_OPERA` | Far-Future Space Opera |

Damage schools, each with a name per family and one colour: kinetic, thermal, cryo, voltaic, toxic,
neural, netrun and nanite (physical, fire, frost, storm, nature, shadow, arcane and holy in fantasy).

Scope, about 280 entries: restoratives, boosts, food, throwables, ammunition, tools and keys,
materials, currency, quest items, containers and gear slots; per-school attacks with support,
mobility, control and utility abilities; emotes and chat; mounts, pets, crafting, gathering and pet
commands; the system menu, social panels, trade, map pins and combat status.

## 5. ICON field changes

| Field | Becomes |
| --- | --- |
| `species` | **Where The Set Is Shown** (action bar, bags, spellbook, buff row, micro-menu, map, character sheet, social panels, vendor, achievements) |
| `role` | **Smallest Display Size** (24, 32, 48 or 64 px) |
| `face_head` | **Motif Treatment** |
| `silhouette` | **Silhouette Discipline** |
| `build` | **Subject Framing**, valid under both looks; the non-square cells go |
| `anatomy` | One value, **Icons With Engine-Applied Overlays** |
| `additional_anatomy` | **Extra Overlay Pieces** |
| `exclusions` | Figure-aware and look-aware wording (R4) |
| `age`, `worn_details`, `primary_colours`, `accent_colours`, `materials` | Cyberpunk options added |
| `setting` | Unchanged options; now drives each entry's look |

## 6. Phases

Every phase runs the five-command gate, the `verify` skill and `/auto-review high`, and lands on
`main` before the next begins.

1. **Roster, series, overlay sheet, named slots, isolated look.** R1–R4, R6, R8, R10, R12, R14.
   Types, limits, look families, and the items-and-consumables and interface-and-system content.
   The icon sheet, overlay sheet and series plans replace `ICON_SYMBOL_SET`. The roster parser on
   both backends, with a pre-catalogue ICON subject falling back to the default. The field changes,
   presets and a starter roster.
2. **Catalogue picker.** A studio section with the look control and a roster summary, and a
   catalogue dialog with search, kind and school filters, tick-all per group and per-entry guidance.
3. **Full-bleed look.** R5, R13, R15, the overlay sheet's tile variant and look-aware prose.
4. **Content.** Spells and abilities by school, then emotes and social, mounts, pets and professions.
5. **Custom entries in the roster.** R9.
6. **Custom-entry library.** A project-scoped table on both backends and in the library pack.
7. **Quantise to 128 px.** R7.

## 7. Record

Each phase appends its record here once it lands. A record is not rewritten afterwards.

### Phase 1 — roster, series, overlay sheet, named slots, isolated look (2026-10-02)

**What shipped.**

- **Types.** `src/types/iconCatalogue.ts` (`ICON_KINDS`, `LOOK_FAMILIES`, `DAMAGE_SCHOOLS`,
  `IconCatalogueEntry`, `IconCatalogueGroup`) and `src/types/iconRoster.ts` (`ICON_LOOKS`,
  `IconRoster`). `SubjectDefinition` gains `icons?`, present exactly where the category declares
  `CategoryDefinition.iconRoster`; `SheetSubject` picks `setting` and `icons` as well (R2).
- **Catalogue.** `src/constants/iconCatalogue/`: 178 entries in 17 groups, every one with all five
  looks — 113 items and consumables (restoratives, boosts, food and drink, throwables, ammunition,
  tools and keys, crafting materials, currency, quest items, containers, equipment slots) and 65
  interface and system icons (system panels, social, trade and services, loot rolls, map pins,
  combat status). Four are two-state toggles and five declare `figure`. `LOOK_FAMILY_OF_WORLD`
  maps every *World & Era* option; a typed world draws the role "as the stated World & Era would
  make it". `iconSheetLimits.ts` holds the 4 × 4 grid, `ICON_ROSTER_CAPACITY` (320 components) and
  `ICON_SERIES_LONGEST` (23). The directory joined `DECLARATION_PATHS` (R14).
- **Series (R1, R6).** `SeriesFor` takes the subject; `iconSeries` is the overlay sheet, then the
  roster chunked sixteen components to a sheet without splitting a pair. `SHEET_INDEX_RANGE.max` is
  now 22. The overlay sheet keeps the thirteen clothing-bound pieces and the empty mark; the
  changed-state pair went, and *Extra Overlay Pieces* lands on it as sheet 0.
- **Named slots.** Each pick is a line labelled with its catalogue id, and a pair names its two
  drawings `<id>-<state>`, so the manifest and sprite pack name every icon.
- **Prompt (R3, R4, R12).** `[IF:CLOTHING_DRAWN_ELSEWHERE]` in section 1, mirrored into §3 of
  `baseline-prompt-new.md`; ICON's exclusion and audit ban only a hand or figure no entry names;
  every icon sheet's intro states its grid from its own count and that a colour an entry names
  outranks the set's accent.
- **Identity (R10).** `sheetIdentity` keys on the subject without its roster plus the sheet's own
  entries, so ticking one more icon keeps every unchanged sheet's tick.
- **Canvas (R8).** `src/constants/categoryAspectRatios.ts` binds ICON to `SQUARE_1_1`, resolved at
  every reader (compiler, wrappers, native grid, digest, atlas, control, category switch).
- **Persistence.** `parseIconRoster` (`src/db/iconRosterParser.ts`) reads a roster on both
  backends through `parseSubject`, dropping retired ids and repeats and stopping at capacity.
- **Fields, presets, starter set.** The §5 field changes, cyberpunk options in the five pools §5
  names, a sixteen-icon starter roster, and five rewritten presets including *Cyberpunk Action Bar —
  Consumables* (ChatGPT 5.6 Sol, 128 × 128 px per icon, isolated look).

**Where it departs from the plan, and why.**

- `ICON_LOOKS` holds `ISOLATED_MARK` alone. `FULL_BLEED_TILE` joins it in phase 3 with the prose
  that draws it, so no stored roster can name a look the prompt does not state.
- A pick is a catalogue id; `CustomIconEntry` and `IconPick` arrive with custom entries in phase 5.
- `kind` sits on the group rather than on each entry, since a group is one shelf of one kind.
- Damage schools are declared as a type only; their per-family names and colours come with the
  spell content in phase 4, where something reads them.
- The R3 gate is declared by the plan (`SheetPlan.drawnElsewhere`) rather than derived from the
  series: a vehicle's directional views paint the cladding its part library draws as panels, so
  "a sibling draws it" does not imply "this sheet carries none of it".
- The exclusions are figure-aware; look-aware wording waits for phase 3, since one look exists.
- Roster actions on `useSubjectStore` wait for the picker in phase 2; nothing edits a roster yet.
- Wording forced by guard tests: *Smallest Display Size* options read `24 × 24 Pixels`, the
  micro-menu option is `System Button Bar` (ICON's assembly negative is `menu screen`), and no look
  names magenta, the default key colour.
- Sweeps that looped to `SHEET_INDEX_RANGE.max` now loop over each configuration's own series
  (`src/test/sheetIndicesOf.ts`); the bound grew to 22 and would have multiplied every sweep.

**What it breaks.** An ICON subject stored before this change — session, history row, saved preset
or library pack — has no roster and falls back to the ICON default subject whole. The old ICON
option values are gone, the `flat-ability-glyph-set` preset is replaced by `flat-system-button-set`,
`ASPECT_RATIO_CHOICES` is replaced by `aspectRatioChoices(category)`, and an ICON configuration
stored with a non-square canvas compiles square.
**Addendum — review fixes (2026-10-02).** A review of the phase 1 commit found thirteen defects,
fixed in a follow-up commit:

- ICON's section 4 guard banned every entry describing anatomy, sending the character panel's bust to
  section 0's tripwire; it now bans only anatomy no entry names.
- The icon sheet counted components as icons and called a two-state entry two subjects. It now states
  its grid in drawings and says a ×2 line is one icon drawn in two states.
- The guard's "overlays it does list" sentence and the audit's icon-agreement check now follow the
  plan's declared `drawnElsewhere`, so neither names what its sheet does not hold.
- A colour an entry names outranks the set's primary colours as well as its accent.
- The section 3 sweep again compiles every raw stored mode and set for every category; only ICON
  skips a repeat resolution, and a test holds each skipped pairing to the prompt it resolves to.
- A one-component sheet reads "Exactly 1 component" and "1 component" in section 6's series list
  (`componentTally`), and is named `Icon N`. The
  same fix reaches every other one-component sheet, such as a single-facing directional core, which
  had read “Exactly 1 components” before the catalogue existed.
- The speculative `DAMAGE_SCHOOLS`, `school`, runtime `ICON_KINDS` and group `label` went;
  `IconKind` names the two kinds in use.
- `drawnElsewhere` is narrowed to `'clothing'`; `iconComponentCount` is the one place a pick's
  component count is written, and the test rosters are cut with `chunkEntries`.
- The architecture copy names the icon roster, the canvas card says why an icon set is square, the
  exclusions card cites the character panel's bust, and `iconSheet.ts` names `capabilityRuns` as the
  reader of its shared assembly sentence.

### Phase 2 — catalogue picker (2026-10-02)

**What shipped.**

- **Store actions.** `useSubjectStore.toggleIcons(ids, on)` and `clearIcons()`, each one act on the
  studio's undo stack, so Undo and Redo restore a tick, a group tick or a clear. The roster is kept in
  catalogue order (`sortIconPicks`, over `iconCatalogueOrder`), so a shelf's icons share a sheet
  however they were ticked. `toggleIconPicks` measures each tick against `ICON_ROSTER_CAPACITY`,
  refusing an entry that does not fit and still ticking a smaller one after it, and the action
  returns the refused ids. `sheetIndexWithinSeries` pulls the sheet index back inside the new series
  in the same act. A tick that changes nothing records nothing.
- **Group labels and kinds.** `IconCatalogueGroup.label` on all 17 groups, now read by the dialog's
  headings and its Tick all and Untick all buttons. `ICON_KINDS` returns as a list with readers:
  `ICON_KIND_LABELS`, the dialog's `ICON_KIND_FILTER_CHOICES`, and the roster tally.
  `iconCatalogueGroupOf` files a pick under its kind.
- **Studio section.** *Icons on this set* (`ICON_ROSTER_SECTION`, `subject:icons`) folds with the
  Subject Definition groups and joins their expand-all control, rendered only where the subject
  carries a roster. It states the roster in plain text through `useIconRosterSummary`: icons,
  components against the capacity, sheets counted from `sheetSeriesFor` with the overlay sheet named,
  and icons per kind (`iconRosterTally`, `iconRosterSummary`). A view-tinted button opens the
  catalogue.
- **Catalogue dialog.** The fifth overlay (`useUIStore.isIconCatalogueModalOpen`), lazy-loaded
  through `LazyOverlay`. It has a search box, a kind filter and a *Ticked only* filter
  (`iconCatalogueSearch`, which matches every typed word against the role, the id, the group label
  and the look the subject's world draws). Each shelf has a heading with its ticked count and Tick
  all and Untick all for the rows shown. There is one memoised checkbox row per entry, labelled by
  its role and described by its look under the current *World & Era*. The look comes through
  `iconLookText`, the resolver the inventory line uses. The footer holds the summary as a polite
  live region, *Clear all* and *Done*.
- **Guidance.** Every row's card is written by `iconEntryGuidance`: the slot or slots it adds, the
  look the sheet draws under the current world, and whether it is one drawing or a two-state pair
  and whether it may show a figure. The filters carry `ICON_PICKER_TOOLTIPS` and the buttons carry
  `ICON_CATALOGUE_ACTION_TOOLTIPS`. A row that cannot fit says why under its label, and a group tick
  left short raises a notice (`ICON_CAPACITY_NOTICES`). `CheckboxField` gained an optional
  `description`, wired as the control's accessible description. The undo and redo cards and the
  studio history panel now name the catalogue's ticks among the acts they step over.
- **Guards.** The guidance suite walks every row's card under one world per look family and the
  typed fallback, as a templated origin. The figures suite holds the capacity and the sheet size to
  their constants. The call-site counts, option-label budget, scrollable-region list and precache
  shapes were brought up to date.

**Where it departs from the plan, and why.**

- **No look control.** One look exists, and a choice of one is not a choice; phase 3 adds the
  control with `FULL_BLEED_TILE`.
- **No school filter.** No spell is in the catalogue yet, so there is nothing to filter by school;
  it arrives with the spell content in phase 4.
- **No group `description`.** The label alone heads a shelf, and the rows' roles already say what it
  holds, so a description would have had no reader that does not repeat them.
- **The group buttons act on the rows the filters show**, not the whole shelf, so a search narrows
  what Tick all ticks. The cards say so.
- **The sheet index is clamped to the last sheet rather than reset to the first.** A roster
  shrinking under a reader part-way through it leaves them nearest the sheet they were on.
- **The capacity cannot be reached by the shipped catalogue.** The catalogue is 182 components
  against 320, so the store's refusal is tested with the capacity moved to five, and the dialog's
  per-row refusal shows only once the spells arrive.
- **`STUDIO_HISTORY_LIMIT` rose from 20 to 50.** Ticks are frequent acts, and at twenty a reader
  building an action bar pushed the category switch before it off the stack within one sitting.
- **`filter` left `PROSE_COLLISIONS`.** The dialog's filter props spell the word in the app's own
  markup, which made the exemption stale, as the build's dead-utilities guard reported.

**What it breaks.** Nothing stored changes shape: a roster is persisted as phase 1 left it. A tick
in the catalogue is now an act, so it drops whatever Redo had to step forward to.
`IconCatalogueGroup` requires a `label`.
