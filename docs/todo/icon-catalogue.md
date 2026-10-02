# Icon catalogue — named icon sets drawn sixteen to a sheet

> **Status:** 🟢 ACTIVE — phases 1–4 shipped; phase 5 next.

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

### Phase 3 — full-bleed look (2026-10-02)

**What shipped.**

- **The look.** `ICON_LOOKS` is `FULL_BLEED_TILE` then `ISOLATED_MARK`, and `parseIconRoster` reads
  either on both backends. **Full-bleed is the default**, on ICON's starter roster: the catalogue was
  built for a World of Warcraft–style action bar, whose icons are painted squares the bar frames, so a
  fresh set opens on the look its main use needs and the isolated mark is one press away.
- **The control.** `useSubjectStore.setIconLook(look)` is one act on the studio's undo stack, through
  the same `writeRoster` the ticks use; a look already in force records nothing, and the sheet index
  never moves because no sheet count does. *Icons on this set* opens on a *Look* row of
  `SegmentedChoice` pills (`ICON_LOOK_LABELS`) under a label whose `Tooltip` (`ICON_LOOK_TOOLTIPS`)
  says what each look changes in the prompt and in the files cut from the sheet.
- **R5.** `SheetPlanFields.backdrop?: 'OWN_SQUARE'`, declared by full-bleed icon sheets alone — never
  the overlay sheet, whose pieces must stay open around their shapes, and not TERRAIN, whose square is
  all ground with seams at its edges rather than a subject in front of a backdrop. It opens
  `OWN_BACKDROP`: a continuation of section 0's background item handing the backdrop to the component
  and only the gutters to the key, named through `BACKGROUND_KEY_DESCRIPTION` so a transparent field
  reads as alpha, and a matching self-audit item. Both are mirrored into §3 of
  `baseline-prompt-new.md`.
- **Look-aware prose.** `iconSheet(entries, first, look)` writes each look's assembly, scale example,
  class, intro and outro: a full-bleed square is painted edge to edge, its subject and its own
  backdrop together, with no frame, border or bevel because the interface draws the frame, and the
  backdrop is a soft field of colour, light and texture, never a scene with a horizon, set apart from
  the subject in value. Its outro answers *Subject Framing*: however loose the subject sits, the
  backdrop fills the rest of the square. `ICON_OVERLAY_PLANS: Record<IconLook, SheetPlan>` replaces
  `ICON_OVERLAY_SHEET`; under full-bleed the veil, halo, ring, cooldown sweep and rarity glow are
  shaped to the square of a tile, with the same labels, parts and counts under both looks. ICON's
  exclusion line swaps the ban on backgrounds for one on scenery beyond a square's own backdrop and on
  anything crossing or drawn along its edge, and says the backdrop is no slot plate; the audit checks
  the squares against each other.
- **R13.** `wrapForModel` takes `ownBackdrop` from the same `OWN_BACKDROP` answer, and Stable
  Diffusion's and Qwen's negatives drop `gradient background` on a full-bleed icon sheet alone;
  `scene background` stays. No other wrapper names a gradient on the field. Sol's directive already
  protects section 0's numbered items, where the block sits, and the inventory.
- **R15 and the presets.** *Cyberpunk Action Bar — Consumables* and *Fantasy Inventory Icon Grid* draw
  full-bleed squares; the system buttons, status badges and map pins stay isolated marks. The
  cyberpunk set takes `PURE_WHITE`: a dark neon square's corners fall towards black, and its violet
  glows lie along magenta's shading plane, which the keying discounts, while nothing in it is washed
  to white. The fantasy grid keeps `TRANSPARENT`. `iconSetKeys.test.ts` holds every hex an ICON preset
  names outside its key's reach, and each full-bleed preset's colours shaded to 95% black and washed
  25% towards white as well, and shows the check failing for black and magenta.
- **Options and guidance.** Every ICON option was read against both looks. The drop-shadow exclusion
  became `No drop shadow cast outside the icon`; *Subject Framing*, *Primary Colours*, *Surface
  Materials*, *Explicit Exclusions* and *Background Key* say how they apply to a square; ICON's
  docblock no longer calls an icon a mark that survives at 32 px.
- **Identity.** `sheetIdentity` in `sheetRuns.ts` keys an icon set's sheets on the look too, since a
  look rewrites every prompt while leaving an icon line's text alone.
- **Tests.** `promptCompilerIconLook.test.ts` compiles both looks: the contract and audit appear
  together on a full-bleed icon sheet and nowhere else, never on another category's sheets, the
  exclusions and audit follow the look, the wrapper term goes only where the backdrop is, and Sol
  carries all sixteen entries verbatim. The parser round-trips both looks on both backends, and the
  store, the section and its keyboard reach are covered. Sweeps over every ICON sheet now walk both
  looks (`iconCatalogueRosters`), and the sheet-claims sweep tells the looks' sheets apart.

**Where it departs from the plan, and why.**

- **The guard is not reworded.** It bans no background, so only its class changes with the look.
- **R15 is held for the presets' named colours alone.** The catalogue names colours in words and the
  school colours arrive in phase 4, so there is no other colour data to measure yet. The default key
  stays magenta: it is the reader's choice, and the reservation in section 0 already reaches a
  square's backdrop, since the block says the backdrop is part of the component.
- **`outputFollowing` became `utils/outputFollowingBase.ts`**, a pure function with its own test, to
  keep `useSubjectStore.ts` under 150 lines once it gained `setIconLook`.
- **Count claims corrected in passing.** `renderStyle.ts` described a default ICON sheet as
  twenty-eight components on a 16:9 page, and a Sol test fixture's docblock repeated the count; both
  predate phase 1. `SegmentedChoice` no longer says every call site is in the Quantise tab.
- **The quantiser is untouched.** A full-bleed square keys out as an opaque square already; resampling
  it to 128 px is phase 7.

**What it breaks.** A fresh or reset ICON subject opens on full-bleed squares, and the two presets
above now draw them, the cyberpunk one on a white key. `ICON_OVERLAY_SHEET` is gone,
`iconSheet` takes a look, and `wrapForQwen` and `wrapForStableDiffusion` take `ownBackdrop`. The
option `No drop shadow outside the icon’s own outline` is retired; a stored subject holding it keeps
the text as typed. Every icon set's copied-sheet ticks are lost once, because the identity key now
carries the look.

**Addendum — review fixes (2026-10-02).** A review of the phase 3 commit found six defects, fixed in a
follow-up commit:

- Section 0 said "a backdrop keeps every rule a component keeps" while the icon sheet asked for a
  backdrop of colour, light and texture, which handed a silhouette pass's single fill and a clay
  pass's single material to the backdrop and contradicted flat, vector and pixel styles. The backdrop
  is now drawn in the render style's own surface, derived from what the style already declares
  (`backdropDescription`, over `validationPassFor`, `RENDER_STYLE_TRAITS` and `RENDER_STYLE_SURFACE`):
  a validation pass takes one flat field of one other value and keeps its fill for the subject, a
  pixel style takes hard bands or dithering on the pixel grid, a style negating smooth gradients takes
  a flat or hard-banded field, and only a painted or rendered style takes soft light and texture. The
  subject's interior detail and materials are its own, and the key reservation is stated for the
  backdrop on its own line. Every render style is compiled under full-bleed against these rules and
  against the Stable Diffusion negative.
- Where the sheet draws an outline, section 0 now puts it round the subject's silhouette and never
  along the square's edge.
- The white key's rationale named colours the cyberpunk preset does not hold. It is now measured over
  every hex colour ICON's colour fields offer, shaded and washed as a backdrop is: black reaches four
  primaries, the preset's Gunmetal among them, magenta reaches Void Magenta, and white reaches none.
  `PURE_WHITE` stands on that evidence, and the test holds it.
- A wrapper comment said Midjourney names no gradient; it carries the style's surface terms, never
  `gradient background`.
- Two docblocks said `backdrop` switches the guard; it switches the exclusion and audit, and the
  guard follows the look through `componentClass`.
- The default look was written twice; `DEFAULT_ICON_LOOK` is now the one place, read by the starter
  roster and by the series' fallback.

### Phase 4 — content: spells and abilities, emotes and chat, mounts, pets and professions (2026-10-02)

**What shipped.**

- **Kinds.** `ICON_KINDS` is `ITEM`, `SPELL`, `SOCIAL`, `COMPANION`, `PROFESSION`, `SYSTEM`, in
  shelving order. The labels, the kind filter, the summary's per-kind counts and the kind filter's
  card are records over every kind, so a kind added later fails to compile until each names it; the
  card is now a list, one line per kind, since six no longer fit one paragraph.
  `iconCatalogue.test.ts` holds the shelves to the kinds' order and a shelf to every kind.
- **Damage schools.** `DAMAGE_SCHOOLS` (kinetic, thermal, cryo, voltaic, toxic, neural, netrun,
  nanite) and `DAMAGE_SCHOOL_DEFINITIONS` in `src/constants/iconCatalogue/damageSchools.ts`: a name
  per family (physical, fire, frost, storm, nature, shadow, arcane and holy in fantasy; the catalogue's
  own names in cyberpunk), a colour word and one hex — steel grey `#B8B2A7`, orange `#F97316`, ice cyan
  `#67E8F9`, electric blue `#3B82F6`, acid green `#84CC16`, violet `#A855F7`, hot pink `#E11D74` and
  gold `#FACC15`. The file joined the domain-colour paths. `damageSchools.test.ts` holds every colour
  and every step of the backdrop series (`src/test/backdropSeries.ts`, now shared with
  `iconSetKeys.test.ts`) out of every colour key's reach, and every pair at least 40 apart in OKLab
  (`pixelDistance`), with the first proposal's kinetic and cryo shown failing.
- **School on the line.** `IconCatalogueEntry.school`, on every `SPELL` entry and no other (a test).
  `iconLookText` closes a spell's look on `— fire school, its dominant colour orange #F97316`, naming
  the school as the world does (`damageSchoolName`; a typed world hears the catalogue's name), so the
  inventory line, the row's second line, its card and the search all say it. The icon sheet's
  colour-priority sentence ranks it above the set's colours unchanged. A spell's card adds a paragraph
  saying the school's colour leads the icon. The catalogue test holds every spell's looks to its own
  school's hue words.
- **School filter.** A *School* select in the catalogue dialog, shown only while the kind is `SPELL`;
  moving the kind off it sets the school back to every school in the same change. Its options name each
  school as the world does — `Fire (thermal)` in a fantasy world (`iconSchoolFilterChoices`) — and its
  card (`ICON_PICKER_TOOLTIPS.school`) lists every school's colour from the record. The sentence the
  search and school cards share moved to `FILTER_HIDES_ROWS_ONLY`.
- **Content.** 148 entries in 19 new groups, every one with all five looks, the catalogue now 326
  entries in 36 groups:
  - Spells and abilities (82 entries, 85 components): seven attacks per school (direct hit, area blast,
    damage over time, channelled attack, finisher, vulnerability debuff, ultimate) on one shelf per
    school; support (8), mobility (5), control (7) and utility (6, three of them two-state toggles —
    stealth and auto-attack off and on, the combat stance assault and guard).
  - Emotes and chat (30 entries): 22 emotes, every one declaring `figure`, and eight chat buttons
    (say, yell, party, guild, raid and trade channels, the emote wheel, and the microphone as an
    unmuted and muted pair).
  - Mounts (8), pets (8) and pet commands (6), kind `COMPANION`; crafting (8) and gathering (6)
    professions, kind `PROFESSION`.
- **Presets.** *Cyberpunk Spellbook — Combat Abilities*: two attacks from each school, full-bleed,
  ChatGPT 5.6 Sol, Near-Future Cyberpunk, square, `128 × 128 px per icon`, face on, on `PURE_WHITE`,
  whose reach `iconSetKeys.test.ts` measures against each of its spells' school colours along the
  backdrop series. *Cyberpunk Emote Wheel*: sixteen emotes as isolated marks on a transparent key, the
  shipped set whose every icon is a figure.
- **Tests.** The figure rescue compiled for a whole emote roster across its two sheets (exclusion,
  rescue sentence, guard and audit), a spell sheet's school text under three worlds and on a mixed
  sheet, the palette rule's reach, the school filter in the dialog, the store filling a set to the
  real capacity from the whole catalogue, and the per-kind counts in the summary and the studio
  section. The whole-catalogue guidance, exclusion and assembly sweeps walk the new entries through
  `src/test/iconCatalogueSubjects.ts` unchanged.

**Where it departs from the plan, and why.**

- **A sixth kind, `PROFESSION`.** A trade is neither a companion nor a spell, and filing it under
  either would put a mining pick on the shelf a reader opens for a mount or a fireball.
- **Every spell and ability has a school, support, mobility, control and utility included**, so the
  SPELL ⇔ school rule has no exception: heals, the cleanse and the revive are nanite (holy), the
  shield and haste voltaic, a slow cryo, a fear neural, an interrupt netrun, a root toxic, and the
  physical moves kinetic.
- **The proposed colours were tuned.** The proposal's slate kinetic and sky cryo sat 24 apart in OKLab
  and its emerald nanite and lime toxic 28, barely past the 12 to 21 a painted key field drifts by. So
  kinetic became a warm steel, voltaic took the electric blue a cyberpunk game gives electrical damage
  and nanite the gold a fantasy game gives holy light; the closest pair now sits 40.5 apart.
- **Chat leaves out whisper and voice chat**, which the social panels shelf already holds, and ships
  raid and trade channels instead. The emote picker is `chat-emote-wheel`, because ICON's assembly
  negative is `menu screen`; five looks say “display” rather than “screen” for the same reason.
- **The whole catalogue no longer fits one set.** It is 334 components against
  `ICON_ROSTER_CAPACITY` (320), which stays where it is: a set is one game's choice from every
  world's archetypes. The test rosters split the catalogue in two, and the browser check ticked every
  shelf: the set filled to 320 components (313 icons), the notice reported the refusal and 13 rows
  said the set was full.
- **Three prompt sweeps compile each of ICON's sheets once** (`resolvedSheetAddress`), as the
  multi-facing sweep already did, because the split catalogue doubled ICON's sheets and the marker and
  punctuation sweeps passed their timeout recompiling them for every mode and set ICON declines; the
  existing test holds each skipped pairing to the prompt it resolves to.
- **The palette rule answers the inventory too.** A fixed palette's block told the model what to do
  with a colour section 1 names outside it; a spell's line now names one by hex, so the rule reads
  “section 1 or section 4”.
- **A one-component last sheet is reachable from the test rosters**, and the sheet-count test now
  reads the contract through `componentTally`, as the prompt does.

**What it breaks.** Nothing stored changes shape, and every existing catalogue id is kept. A dialog
filter value now carries `school`. The palette block's colour rule names the inventory beside the
subject in every category's prompt. The `output` chunk grows past Vite's advisory 500 kB warning
(526.6 kB) because the catalogue is compiled into it; the precache stays under its ceiling.
