# Icon catalogue — named icon sets drawn sixteen to a sheet

> **Status:** ✅ COMPLETE — all seven phases shipped, from the roster and the catalogue to the 128 px resizing fits.

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

**Addendum — review fixes (2026-10-02).** A review of the phase 4 commit raised fifteen findings.
Fourteen held and were fixed; one claim within them did not, as the last item says.

- **Validation passes outrank the inventory's colours too.** A spell line names its school's hex,
  and the inventory outranks the set's colours, so under `SILHOUETTE_ONLY` or `CLAY_RENDER` the
  orange would have beaten the one flat fill. Both passes' prose and section 0's precedence sentence
  now cover a colour an entry in section 4 names; the template change is mirrored into
  `baseline-prompt-new.md`, and a spell sheet is compiled under both passes.
- **No pick in a preset names its key colour.** The spellbook's three white-hot and white-spark looks
  sat on a white key. Every cyberpunk look now avoids white (the cyberpunk sets take `PURE_WHITE`),
  and a preset test holds every pick against its own key's colour words.
- **Pink is the netrun school's alone.** Neon pink as a model reads it (`#FF10F0`, `#FF6EC7`) lies
  inside the default magenta key's reach, measured; the netrun line pins its pink by hex clear of
  every key. So every look outside that school that named pink, older shelves included, moved to crimson, amber,
  violet or cyan, and a catalogue test holds the rule and shows the measurement biting.
- **Lettering objects.** Runes, dials, gauges, keypads, a stopwatch, an open scroll, a progress bar
  and capitalised acronyms (`EMP`, `APC`, `USB`, `UV`, `HUD`, `LED`) left every look that had them,
  older shelves included; a catalogue test bans them, and a scroll must be rolled.
- **Distinct silhouettes, standalone devices, no scenery.** The near-duplicate attacks and abilities
  the review listed each took a silhouette of its own; looks implying a limb are devices; the
  back-alley, street-side, asphalt, deck-grate, concrete, half-buried and basking-stone settings went;
  the two weak toggle pairs change shape between states; the thermal fantasy looks lead with orange.
- **Guidance and helpers.** A spell's card names its school as the world does (`damageSchoolName`),
  and the filter's labels use `capitalised`.
- **The skip guard covers what the sweeps skip.** Two sweeps gained the per-address skip in this phase
  (marker and punctuation); the multi-facing sweep had it already, so the record's “three sweeps”
  means two new and one existing. The guard that made the skip safe compiled the default subject at
  two sheets. It now compiles every skipped subject (starter set and whole-catalogue rosters in both
  looks), with the companion outputs on and with named anatomy, at every sheet and the index past the
  last, under every stored mode and set: `src/test/iconSkippedPairings.ts`, run by three
  `promptCompilerIconSkip*.test.ts` files side by side.
- **Test precision.** The school floor is justified in the metric it measures, plain OKLab (40 is
  about eight of CSS Color 4's 0.02 just-noticeable steps); the compile tests assert the inventory's
  own section number; the preset docblock names the two full-bleed cyberpunk sets.
- **Bundle.** The catalogue's data is a chunk of its own (`codeSplitting` group in `vite.config.ts`,
  listed in `PRECACHE_SHAPES`): `output` is 367.1 kB and `iconCatalogue` 159.6 kB, and the 500 kB
  advisory is gone without raising the limit. **The duplication the review reported does not hold:**
  every look string was in `output` alone, and what `useSubjectStore` carries is the presets' pick ids,
  not the catalogue.

### Phase 5 — custom entries in the roster (2026-10-02)

**What shipped.**

- **Types.** `src/types/iconRoster.ts` declares `CustomIconEntry` (`id`, `role`, `kind`, `school`
  exactly when the kind is `SPELL`, `figure`, two optional `states` and one `look`), `IconEntry` (a
  catalogue entry or a custom one) and `IconPick`, a union tagged by `source`: `{ source: 'CATALOGUE',
  id }` or `{ source: 'CUSTOM', entry }`. `IconRoster.picks` is `readonly IconPick[]`. The starter
  roster and the seven presets declare their ids through `cataloguePicks`. A catalogue pick stores only
  its id, so a reworded look reaches every saved set; a custom pick stores its entry, since the roster is
  the only place it exists.
- **One gate.** `checkCustomIcon(draft, picks, replacing)` (`src/utils/`) is what the form, the store's
  three actions and the roster parser all call. It refuses, field by field: an empty role or look; a
  role, look or state past `CUSTOM_ICON_LIMITS` (48, 200 and 24 characters, sized above the catalogue's
  longest role of 34 and look of 149); a `[` or `]` in any of them (R9: the inventory is resolved for
  `[SEC:…]` citations, so a bracket either throws or is silently replaced by a section number); a role
  or state with no plain letter or digit to name a slot; two states of one name; a spell with no school
  and a school on anything else; a slot name — the entry's id, or `<id>-<state>` for each drawing of a
  pair — that a catalogue entry or one of its pair's drawings, an overlay piece in either look
  (`takenIconSlotNames`) or another pick on the roster already answers to; and an entry the set has no
  room for. Each refusal says what is wrong and what to do (`CUSTOM_ICON_REFUSALS`). It collapses
  whitespace, line breaks included, derives the id from the role with `slugify`, slugs the states as a
  catalogue entry's are, and leaves the reader's spelling and punctuation alone.
- **Warnings.** `customIconWarnings(draft, key)` reads the role, look and states against the rules the
  catalogue was written to, now one file, `src/constants/iconCatalogue/iconLookRules.ts`, which
  `iconCatalogue.test.ts` and `iconSetKeys.test.ts` read too, so the catalogue's rules and the
  reader's warnings cannot drift: the words of the background key in force (`KEY_COLOUR_WORDS`, pink
  spared on a netrun spell as in the catalogue), lettering (`letteringTermIn`, `LETTERING_OBJECTS`, a
  capitalised acronym, an unrolled scroll) and a person or part of one on an entry not declaring
  `figure`. A warning names the word and what the prompt will do with it (`CUSTOM_ICON_WARNING_TEXT`);
  the entry is saved as written.
- **Order and chunking.** `sortIconPicks` sorts by kind, the catalogue before the reader's own, then
  the catalogue's order, and is stable, so the reader's own entries sit at the end of their kind's
  shelves in the order they were added; a changed entry keeps its place unless its kind changes, when it
  joins the end of its new kind. `iconComponentCount` counts either kind of entry, so the capacity, the
  tally and `chunkEntries` treat a custom pair exactly as a catalogue pair and never split it.
- **Readers.** `rosterIcon` resolves a pick to its entry and kind; `iconRosterEntries`,
  `iconRosterTally` (now with a `custom` count), `iconRosterSummary` (“20 icons, 3 of them your own,
  …”), `toggleIconPicks` (which touches catalogue picks alone), `sameIconRoster` (field by field),
  `parseIconRoster`, `presetSearch`, `iconCatalogueSearch` and the test helpers read it.
  `iconLookText` draws a custom look as written under every world, closing a spell on its school as a
  catalogue spell does. `sheetIdentity` needed nothing: it keys on the drawn entries' labels and text.
- **Store.** `useSubjectStore.addCustomIcon(draft)`, `updateCustomIcon(id, draft)` and
  `removeCustomIcon(id)`, each one act on the studio's undo stack through `writeRoster`, so the sheet
  index is clamped in the same act. Add and update return the check's refusals and change nothing when
  there are any; an update equal to what it replaces records nothing. `SubjectState` moved to
  `src/types/subjectState.ts`, which kept the store under the module-size target.
- **Dialog.** *Add your own icon* opens `CustomIconForm` above the shelves: Role, Kind of icon, Damage
  school (while the kind is a spell, named as the world names it — `damageSchoolChoices`, now shared
  with the school filter), Shows a figure, Two states with First state and Second state, and Look, with
  Add to your set or Save changes, and Cancel. A refusal shows under its field once the field holds text
  or Add was pressed, wired through a new `problem` prop on `TextField` and `TextAreaField`
  (`aria-invalid` and `aria-describedby`); warnings sit in a polite live region. Focus goes to the role
  on opening, to the first refused field after a refused press, and back to the opener on closing. The
  reader's own entries sit on shelves headed `<Kind>: your own` after the catalogue's last shelf of that
  kind (`customIconShelves`, narrowed by the same `iconFilterMatch` as the catalogue's rows), each row
  ticked with the reason it cannot be unticked, a *Your own* badge, and Edit and Remove; Remove raises a
  notice that Undo brings it back.
- **Guidance.** `CUSTOM_ICON_TOOLTIPS` for the eight fields; `addOwn`, `submitNew`, `submitChange`,
  `cancelOwn`, `editOwn` and `removeOwn` in `ICON_CATALOGUE_ACTION_TOOLTIPS`; a custom row's card from
  `iconEntryGuidance`; the Clear all card, the undo and redo cards and the studio history panel name the
  new acts. The guidance suite walks the custom cards (one of each shape and one written to every limit,
  under every world), the refusals, the notices and the warnings.
- **Tests.** The check (every refusal and its message, the limits exactly, a replacement), the
  warnings (each rule under each key, the netrun pink, the figure flag), the parser (round trip, a
  hostile or malformed stored entry dropped in seventeen ways, a bare stored id dropped, the slot name
  re-derived, a custom pair counted twice), ordering, the toggle, the tally, the summary, the shelves,
  the store actions with Undo and Redo, compiles of an item, a spell under three worlds, a pair and a
  figure, a pair kept whole across a sheet boundary, a hand-built `[SEC:X]` entry shown to throw and a
  stored one shown never to reach the compiler, the form and the dialog's shelves, and the session,
  history, saved preset and library pack on each backend (`localStorageBackendCustomIcons.test.ts`,
  `sqliteBackendCustomIcons.test.ts`).

**Where it departs from the plan, and why.**

- **Validation is two utils, not one.** The refusals are `checkCustomIcon`, which the form, the store
  and the parser share. The warnings are `customIconWarnings`, which the form alone reads, because they
  are measured against the background key in force, which the parser has no business reading and which
  can change after an entry is saved.
- **Warned, not refused, for the content rules.** Each is a word match standing in for a judgement the
  reader makes better: black is a hole on a black key and a fine colour on a white one, the key can
  change after the entry is saved, a rune may be the carved ornament they want, and a hand may be the
  point of the icon. Only what breaks the output whatever the reader means is refused. The catalogue's
  other two content rules, no hue another school owns and no scenery, are not warned of: they keep the
  shipped catalogue consistent with itself, and a reader's own world is theirs to judge.
- **Slot names are unique beyond the roster.** A custom id may not take a catalogue entry's name even
  where that entry is not ticked, since ticking it later would leave the reader with two icons one set
  cannot hold, nor an overlay piece's, since the overlay sheet's files sit beside the icons'.
- **A custom row cannot be unticked.** The roster is the only place the entry exists until the
  library of phase 6, so an untick would be a removal; it says so under its label, and Remove, which
  Undo takes back, is how it leaves. *Clear all* removes the reader's own entries with the rest.
- **The parser keeps the stored order** rather than sorting, because the store writes every roster
  sorted, and it derives a custom entry's slot name from its role rather than trusting the stored id.
- **A custom row's card does not repeat its look**, which the row shows under its label: a look
  written to its 200-character limit took the card past the 800 a card is held to.
- **The catalogue's data chunk is `iconCatalogueData`.** The bundler names the shared chunk after a
  module it carries, and with this phase's imports it chose an `iconCatalogue` one over `output`; the
  data group, renamed, keeps the two apart in `PRECACHE_SHAPES`. The bytes did not move: the data
  chunk is 159.6 kB as before and the shared one 372.7 kB.

**What it breaks.** A roster stored before this change holds bare ids, which no longer parse as picks,
so every session, history row, saved preset and library pack from before keeps its look and loses
every icon. `IconRoster.picks` is `readonly IconPick[]`, and `toggleIconPicks`, `sortIconPicks`,
`iconRosterTally` and `iconCatalogueSearch` take picks; the tally carries `custom`. `iconLookText`,
`iconEntryGuidance` and `iconComponentCount` take either kind of entry. `KEY_COLOUR_WORDS` is a list of
words per key, matched from the start of a word, rather than a pattern. *Clear all* removes the reader's
own entries. The precache lists `iconCatalogue` and `iconCatalogueData` in place of `iconCatalogue` and
`output`.

**Addendum — review fixes (2026-10-02).** A review of the phase 5 commit raised seven findings. All
seven held when re-derived, and each was fixed in a follow-up commit with a test shown failing against
the old code:

- **An edit could be saved to nothing.** With an entry's form open, *Clear all* (or a removal or an
  undo) took the entry off the roster, and Save changes then matched no pick, changed nothing and closed
  as if it had worked. `checkCustomIcon` now refuses a change whose entry is no longer on the roster
  (`CUSTOM_ICON_REFUSALS.gone`), and the dialog closes a form whose entry leaves the roster by any route,
  settled during render rather than in an effect, so an undo bringing the entry back does not bring back
  a stale form.
- **A kind change did not move the entry**, though this record said it did. Every custom entry of a kind
  sorts with one key, so replacing it in place kept its array position. `withCustomIcon` now replaces
  in place only while the kind stays, and otherwise takes the old pick out and appends the new one, so
  it lands after the new kind's own entries; the store test puts another entry of that kind on the set.
- **A count in the reader's words reached the inventory line.** A role `Arrow ×5` compiled as `Arrow ×5
  ×1 — …`, and section 4 reads `×N` as N drawings. The rule, `COUNT_MARKER` in `iconLookRules.ts`: `×`
  with a digit on either side, or an `x` standing as a word before a number (`x5`, `x 5`) or straight
  after one (`5x`), in a role, a look or a state; an `x` inside a word or between numbers (`0x1F`, `4x4`)
  passes. The line's em dash, and its en dash twin (`LINE_SEPARATOR`), are refused in a role and a state
  name, where they would read as the divide between role and look, and allowed in a look, which the line
  closes on anyway. Both are `checkCustomIcon`'s, so the form, the store and the parser apply them.
- **Escape inside the form closed the whole dialog** and threw the draft away. The form now takes
  Escape for itself and cancels as Cancel does, returning focus to its opener; Escape anywhere else
  still closes the dialog.
- **The figure test could not fail.** No compiler code reads `figure`, and the rescue sentences are on
  every ICON sheet, so “a figure entry compiles with the rescue” in this record overstated it: the rescue
  is unconditional, and a custom entry's `figure` mark changes only the form's warnings and the row's
  card. The test now compiles the entry with and without the mark to the same prompt, and the card for a
  marked custom entry says what the mark does rather than claiming the exclusions allow it because of it.
- **A guard was loosened.** The catalogue's magenta check matched a colour word anywhere in a word
  before `KEY_COLOUR_WORDS` moved into `iconLookRules.ts`, and only from a word's start after. It, and
  the presets' key-colour check, now read the same list through `wordWithin`, which matches anywhere, so
  `hotpink` fails again; the reader's warnings keep the word-start reading.
- **Stale docblocks** in `TextField`, `subject.ts`, the ICON category and `subjectState.ts` now say the
  roster holds the reader's own entries, that the form's role and states are required, and that *Clear
  all* removes the reader's own entries as well as unticking the rest.

### Phase 6 — custom-entry library (2026-10-02)

**What shipped.**

- **Storage.** `SavedCustomIcon` (`src/types/savedCustomIcon.ts`): a library row's own `id`, which an
  edit keeps, its `projectId`, and the `entry` as `checkCustomIcon` passed it. A `custom_icon_entries`
  table (`id`, `project_id`, `entry_json`, `updated_at`) with its statements in
  `src/db/customIconStatements.ts`, and the localStorage key `sprite_gubbins_custom_icon_entries`.
  `PersistenceBackend` gains `saveCustomIcon`, `listCustomIcons` and `deleteCustomIcon` on every
  implementation: SQLite through three new worker requests, the fallback, the held-elsewhere backend
  (lists nothing, refuses the writes) and both test doubles. One parser reads a row from either backend
  (`parseCustomIconRow`), and a stored entry goes through `parseCustomIconEntry`
  (`src/db/customIconEntryParser.ts`): its fields typed by `readCustomIconDraft`, which the roster
  parser now shares, then held to `checkCustomIcon` with no roster or library beside it, so a bracket,
  a count, a long dash in a role or a slot the catalogue or the overlay sheet answers to is dropped
  rather than drawn.
- **Cascade and import.** Deleting a project deletes its library in the same transaction
  (`deleteProjectIn`, `src/db/sqliteLibrary.ts`, which also holds `replaceLibraryIn`; the fallback's
  `deleteProjectFrom` empties it before the project goes). `LibraryPack.customIcons` travels in the
  library pack: `parseImportedCustomIcon` repairs a missing project to Default, refuses what the form
  refuses, the pack re-files an icon naming a project the file does not carry, and `firstOfEachSlot`
  keeps the first of two icons in one project answering to one slot (a pair's drawing names included);
  one slot in two projects is two libraries and both stay. `libraryPackSize`, the confirmation's
  figures (`ProjectTransferControls`, the transfer store's own count) and the re-reads after an import
  and a project delete all include the library.
- **Older storage stays.** The SQLite discard compares stored objects against the DDL one way only, so
  a database without the new table is kept and the table made on the same boot; the fallback's discard
  counts the new key among the collections filed under a project, and an absent key is no reason to
  discard. A test boots a database made by the DDL without the table and keeps its rows.
- **Store.** `useCustomIconLibraryStore` holds every project's library, as the preset stores hold
  every project's presets, because the pack exports them all and the Projects view counts them, and
  `chosenProjectId`, the project the dialog shows. `useIconLibrary` narrows it to that project through
  `chosenProjectId(projects, chosen)`, now the one fallback rule every project control uses (the two
  save panels and `ProjectSelectField` had it inline). The store's actions are `writeCustomIcon` (add,
  or change the slot `replacing`), `tickCustomIcon`, `keepCustomIcon`, `deleteCustomIcon` and
  `chooseProject`.
- **Behaviour.** An add puts the icon on the set as one act and saves it to the chosen project's
  library. A change to a ticked icon, or to one only the set holds, changes the set as one act and the
  library row; a change to a library icon the set does not hold changes the library alone and is not
  measured against the set's room. **A set holds its own copy**: a saved preset or history entry keeps
  the copy it was saved with, and neither an edit nor a delete in the library reaches it. A custom row
  now unticks (the set's copy goes, the library's stays) and ticks again (the library's copy is put on
  the set, through the same check). Delete asks in place (`useConfirmInPlace`, its sixth call site) and
  leaves every set's copy; the ticked row then offers **Save to library**. Undo moves the set alone: the
  library is stored work, as a saved preset is.
- **Slots.** `checkCustomIcon(draft, picks, replacing, library)` takes the project's library and
  refuses a slot one of its entries answers to (“your library’s …”), ticked or not, so a later tick can
  never meet a clash. `replacing` is measured as gone from both; the gone refusal fires only where the
  entry is in neither; the set's room is measured only where the entry is going onto the set.
- **Dialog.** `CustomIconLibraryBar` heads the reader's own shelves with a *Library* project select
  (`ProjectSelectField`, guidance `ICON_PICKER_TOOLTIPS.libraryProject`) beside *Add your own icon*.
  `customIconShelves` makes one row per slot from the set and the library: ticked or not, the set's
  copy where ticked, a note where the set alone holds it (`CUSTOM_ICON_NOTICES.setOnly`) or its copy is
  not the library's (`differs`), and in role order. Search, kind, school and *Ticked only* cover library
  rows. A row too big for the set's room says so, as a catalogue row does. A form closes when its entry
  leaves both the set and the library. `CheckboxField` gained an optional `note`, wired into the
  accessible description.
- **Projects view.** Each project lists its icon library by name and slot, and its counts, the header's
  and the delete confirmation's include it.
- **Guidance.** New action cards (`deleteOwn`, `confirmDeleteOwn`, `cancelDeleteOwn`, `keepOwn`); the
  add, save, change, cancel, edit and Clear all cards, the custom row's card, the undo cards, the search
  card and the project cards (select, delete, export, import) say what the library keeps. `removeOwn`
  and the notice `yours` went with the Remove button.
- **Tests.** `sqliteRequestsCustomIcons.test.ts` runs every library request against the SQLite build
  the worker loads, in memory: CRUD, the cascade, the import and its rollback, and hostile rows.
  `localStorageCustomIconLibrary.test.ts` holds the same on the fallback, with the restore after a
  refused import write and the discard; `sqliteBackendCustomIcons.test.ts` the worker bridge;
  `discardIncompatibleDatabase.test.ts` the older database; `libraryPackCustomIcons.test.ts` the
  round trip and fourteen hostile or malformed entries; `useCustomIconLibraryStore.test.ts` the store,
  failures included; the project and transfer store suites the cascade and the import;
  `IconCatalogueLibrary.test.tsx` the dialog (untick keeps, re-tick restores, delete keeps set copies,
  keep, a copy that differs, a library-only change, a library slot refused, the project switch, search
  and *Ticked only*); and the guidance suite every new card and notice.

**Where it departs from the plan, and why.**

- **The library's project is chosen in the dialog and lasts while the tab is open**, not stored. The
  app has no active project; a project is chosen where a save is made, which `usePresetStore` states as
  a rule, and the save panels open on the first project. The library opens there too, so it and both
  save panels agree until the reader chooses otherwise. Storing the choice would have meant a column on
  `studio_session`, which discards every reader's database, or a setting the settings dialog's Reset
  would clear.
- **The store holds every project's library** rather than loading one project's: the pack exports all
  of them and the Projects view counts them, as it does the presets.
- **Shelf rows are in role order**, not the sheets' order: a library grows across many sets, a reader
  finds an entry by name, and a row must not move under the pointer as it is ticked.
- **No Tick all or Untick all on the reader's own shelves.** An untick of an icon the library does not
  hold removes it, which a group press should not do to several at once.
- **Delete confirms in place rather than offering Undo**, because the studio's undo stack is the set's
  and the library is stored data, as a saved preset is; every other stored delete in the app confirms.
- **The localStorage backend names its collections once** (`STORED_COLLECTIONS`,
  `src/db/localStorageCollections.ts`): a fifth collection pushed the backend past the module-size
  target, and the key, parser and row writer of each now travel together.
- **The catalogue dialog's suites find controls without role queries** (`src/test/catalogueControls.ts`).
  A role query computes every accessible name among three hundred rows, and the dialog's tests ran past
  the test time limit at two workers; the existing dialog suite was moved onto it too.
- **Sweeps from before this phase were split** after they failed the two-worker, one-second survey on
  this branch, or came within a few per cent of it, each into the unit its property is about, with its
  coverage kept, a check that its cases still cover what it covered, and no timeout raised:
  `componentBoundary.test.ts`, `componentSet.test.ts` and `sheetPlanAbsence.test.ts` one case per
  reachable sheet; `sheetIdentity.test.ts` one per batch; `subject-field-inventory.test.ts` one per
  sheet address; `promptCompiler.test.ts`'s numbered-list and marker sweeps one per target and its
  single-facing sweep one per subject and mode, or per sheet of an ICON roster; the blend-weight
  figures one per weight; and the despill and anti-alias corpus cases one per keying or mode.

**What it breaks.** `checkCustomIcon` takes a fourth argument, the library; `addCustomIcon` and
`updateCustomIcon` on `useSubjectStore` take the library too, and the form writes through
`useCustomIconLibraryStore.writeCustomIcon`. `LibraryPack` requires `customIcons`, and a pack file
written before this change imports with an empty icon library. `CUSTOM_ICON_NOTICES.yours` and the
*Remove* button are gone: a custom row unticks. `customIconShelves` takes the library and returns rows.
An existing database gains an empty `custom_icon_entries` table and keeps everything else.

**Addendum — review fixes (2026-10-02).** A review of the phase 6 commit raised eleven findings. All
eleven held when re-derived, and each was fixed in a follow-up commit with a test that fails against the
old code:

- **A refused rename of a library icon lost the draft.** The library store showed a change to a library
  icon the set does not hold before its write landed, so the renamed row replaced the old slot, the
  dialog closed the form as one whose entry had gone, and a refusal then restored the row with the form
  and the draft already lost. Only an icon the set has just taken is shown early now; a library-only
  change is shown once stored, so its form stays open with the draft on a refusal and closes only after
  a write that landed.
- **A Delete question outlived a project switch.** The row keeps its slot as its key, so an open question
  stood over the other project's row of the same slot, or came back after Save to library. The question
  now belongs to one library row (`useConfirmInPlace(subject)`) and drops, during render, whenever the
  row shows another.
- **A confirmed Delete on a ticked row sent the keyboard to the next row.** `confirm` takes a `home`, and
  the row passes its own Save to library button.
- **Library writes could interleave.** A refresh replaced the list wholesale, wiping a row another write
  had shown early, and two writes could each pass a check the other was about to break. Writes and
  deletes now run one at a time (`createSerialQueue`), each measured against what storage holds when its
  turn comes, and rows shown early survive a refresh (`customIconLibraryWriter`). Storage cannot hold two
  rows answering to one slot of a project.
- **The custom row's card claimed a library copy on a row the library does not hold.** `iconEntryGuidance`
  takes whether the library holds the entry, and says otherwise that an untick takes the icon away.
- **Copy and counts.** The project form names the icon library among what a project files; the project
  store, `App`, the pack noun's example, `findByNameIn` (whose name rule is the two preset collections')
  and the spec's stores bullet were brought up to the four collections and the new store.
- **Seams.** The held-elsewhere backend's test lists the library's read and two writes. The boot-time
  discard derives its keys from `FILED_UNDER_A_PROJECT`, and a test walks that list through a project
  delete and the discard, failing for a collection added without a sample.
- **The dialog suites' accessibility coverage.** `control(name, role)`, `buttonReading`, `shelfHeaded`
  and `formNamed` now assert the role and the computed accessible name of the one element they find,
  with jest-dom's matchers, so a control that lost either fails; the docblock says what they check.
- **An anti-alias case read a cache two others filled.** The comparison moved into the interior case,
  which holds the measured interior below the recorded `both` by more than the `both` case's tolerance,
  so the two independent cases together prove the strict inequality.

### Phase 7 — quantise painted icon sheets to 128 px (2026-10-02)

**What shipped.**

- **The fit.** `SpriteCellChoice` and the resolved `SpriteCell` carry `fit: SpriteFit`, one of
  `SPRITE_FITS`: `REFUSE` (*As drawn*, the default and the old behaviour), `SCALE_SET` (*Scale
  evenly*) and `FILL_SQUARE` (*Fill square*). `resolveSpriteCell(choice, target, grid)` resolves a
  resizing fit to `REFUSE` on a sheet read at a pixel grid above 1 (`resizingFitAllowed`), so pixel
  art keeps the lattice path; the result's grid now reaches `DownloadControls` and
  `SpriteCellControls` through `ComparisonToolbar`. `oversizedSprites` refuses nothing under a
  resizing fit.
- **The rule.** `cellPlacements` (which replaces `cellOffsets`) returns, per sprite, the region cut
  from the sheet and the rectangle it is drawn into inside the cell, at 1:1, magnified with
  everything else. Under `SCALE_SET` the region is the box and the size is the box times one factor
  for the whole sheet, `evenScale`: the cell's side over the sheet's grid pitch, the smaller of the
  two axes, and never past the largest factor that fits every sprite. The pitch is `spritePitch`, the
  median centre-to-centre step within the rows `spriteRows` reads and between those rows. Under
  `FILL_SQUARE` the region is the square at the centre of the box, drawn at the cell's shorter side.
  Both are placed at the anchor.
- **The resampler.** `resampleArea(source, region, width, height)`: a box filter over exact
  fractional coverage, separable, averaged in premultiplied alpha, exact for whole factors and for a
  flat colour, deterministic, no dependency. `median` moved out of `frameLattice.ts` into its own
  util, which `spritePitch` shares.
- **The palette order.** The sheet is quantised whole and at full size as before; the pack resamples
  each sprite from that result and then, where a palette step decided the sheet
  (`QuantiseResult.paletted`, carried to the writer as `SheetWriteJob.paletted`), maps every resized
  pixel back onto the colours the sheet holds (`sheetColourHold`): coverage to the nearest level the
  sheet uses, then colour to the nearest of its colours. Resampling after the palette and stopping
  there wrote colours outside it; resampling before it would have chosen the palette, the lock and
  every cleanup from 128 px icons instead of the sheet. A sheet left at its own colours keeps the
  resample's blends.
- **The pack and the manifest.** `encodeSpritePack(sheet, manifest, layout, paletted)` cuts a
  placement whose drawn size is its region's own exactly as before, and resamples one that differs.
  `MANIFEST_VERSION` is 5: `ManifestSprite.cellOffset` became `placement` (`from`, `x`, `y`, `width`,
  `height`), `ManifestCell` carries `fit`, and the pivot is on the cut square under `FILL_SQUARE`.
- **The control.** A *Fit* row (`SpriteFitChoice`) after the anchor, shown wherever there is a cell;
  on a pixel-art sheet its two resizing pills stay on screen, `aria-disabled`, with
  `SPRITE_FIT_UNAVAILABLE` under them, and *As drawn* shows pressed. The chip (`cellBadgeText`) states
  what the cut will do: `128 × 128 cell at 43%` or `128 × 128 cell, each square filled`.
- **Guidance.** `QUANTISE_TOOLTIPS.spriteCellFit` says what each fit does and when to use it, and
  that a painted icon set reaches 128 × 128 px with *Studio target*, *Centre* and *Middle*; the cut and
  both anchor cards say the same for an icon set; the cell size cards, *Save at*, the sprite pack and
  manifest buttons, and ICON's look card (which names the fit for each look) were brought up to the
  fits. Every docblock that said nothing resamples or that a larger sprite is always refused now says
  under which fit.
- **Tests.** The resampler (whole and fractional factors, flat colours at three sizes, an edge against
  transparency, a coverage that rounds to nothing, conservation, a region, identity, enlarging,
  determinism); the pitch and the factor; the placements under both resizing fits and the grid's
  degradation; the colour hold; the manifest's placement; the pack writing sixteen named 128 × 128
  files from a painted 4 × 4 sheet under each look (`src/test/paintedIconSheet.ts`), full-bleed files
  covered edge to edge, marks keeping their relative sizes, every resized file's colours inside a
  sixteen-colour sheet's and outside it with no palette step; a pixel-art pack's sprite files
  byte-identical to the old crop-and-place; the control, its chip, its held pills and its keyboard
  reach; the press sending the fit and `paletted`, and `REFUSE` at a grid of 4.

**Where it departs from the plan, and why.**

- **Three fits, not one `SCALE_INTO_CELL`.** The two rules the plan gave one value cannot be told apart
  from the artwork: a full-bleed tile and a dense isolated mark can share a box and a fill, and
  guessing crops a mark or shrinks every tile by a different amount. The cell already asks the reader
  for the two things it cannot derive, the size and the anchor, so the fit is a third statement, and
  ICON's look card names the fit for each look. Reading the studio's `backdrop` was rejected for the
  same reason the tab never trusts the studio about the dropped sheet: nothing checks that the sheet
  is the one the studio is composing.
- **Nothing is persisted and no preset carries the fit.** The cell choice lives in
  `useQuantiseDownloadStore`, which survives navigation and not a reload, and the quantise presets
  carry dials rather than the download's cut; the fit joined the choice where it lives.
- **Neither of the plan's two palette orders.** Both broke something, as the record above says, so
  the palette is chosen on the full sheet and the resized pixels are matched back onto it.
- **No new preview pane.** The tab has never drawn a cut cell under any fit; the chip states the
  factor or the fill before the press, and the files are written at it.
- **The magnification still multiplies the cell**, under a resizing fit too, so *Save at* `1×` writes
  the 128 px files and `2×` writes 256 px ones resampled from the same region; the cell stays in drawn
  pixels, as it always was.

**What it breaks.** A manifest is version 5: `cellOffset` is gone in favour of `placement`, and the
cell states `fit`. `SpriteCellChoice` and `SpriteCell` require `fit`; `resolveSpriteCell` takes the
grid; `cellOffsets` is replaced by `cellPlacements` and `cellPivot` takes a region; `encodeSpritePack`
takes `paletted`, as `SheetWriteJob`, `SheetDownload` and `QuantiseResult` now require it; and
`DownloadControls`, `ComparisonToolbar` and `SpriteCellControls` take the grid. Nothing stored changes
shape, and a pack cut as drawn writes the same sheet and sprite files as before.

#### Phase 7 addendum — review fixes (2026-10-04)

A high-effort review of phase 7 found five things, fixed in one further commit before it landed.

- **`Scale evenly` could measure a negative or zero pitch.** `spritePitch` read its steps along
  `spriteRows`'s rows, which widen to take every sprite they touch, so a painted icon reaching below
  the top of the row beneath chained two rows of the grid into one, and the steps along it ran
  backwards: a 2 × 2 sheet came out at a pitch of −5 and a factor of −25.6, every sprite drawn at
  1 × 1, and a zero pitch gave an infinite factor. The pitch is now read between lines from
  `spriteBands`, the narrowing half-overlap band `spriteStrips` already used, now shared and run on
  either axis; line positions are sorted and a zero step is dropped, so a measured pitch is always
  positive, and `evenScale` refuses one that is not positive and finite all the same. Tests: the
  chained sheet (pitch and factor), two hundred seeded grids of overrunning marks, and the guard.
- **The grid and `paletted` were drilled four components deep**, from `ImageComparison` through
  `ComparisonToolbar` and `DownloadControls` to `SpriteCellControls`. `DownloadControls` now reads
  them from the stores through `useShownResult`, gated by `succeededOnScreen`, the one rule
  `useQuantiseWork` also applies to the result on screen; `SpriteFitChoice` takes only whether the
  sheet may be resized. `ComparisonToolbar` no longer takes the grid, and `DownloadControls` no longer
  takes the grid or `paletted`, which reverses that part of what phase 7 broke.
- **The colour hold matched across all four channels**, so a pixel held to half coverage could land
  on an opaque colour of a nearer hue and grow the silhouette. It now matches the colour only among
  the sheet's colours at the coverage it was held to, as its docblock said.
- **`SegmentedChoice`'s docblock** named one caller withholding values where there are two.
- **Three weak tests.** The resampler's conservation test now runs on a translucent field and holds
  alpha to its own bound, half a step a pixel. The colour bound doubled to a whole step a pixel,
  because on a translucent field the stored alpha rounds as well as the colour, and the old bound only
  held where every pixel was opaque. The determinism test, which could not fail, is gone, and so is an
  assertion in the fit's keyboard test that restated an earlier one.
- **The capture to the identity lock asked the same question a third time.** `quantisedSheetCapture`
  decided for itself whether the tab was showing a result; it now asks `succeededOnScreen` too, after
  its own check for a failed transform. The pitch guard is `gridStepFactor`, tested on its own,
  since the fixed `spritePitch` gives `evenScale` nothing it would refuse.
