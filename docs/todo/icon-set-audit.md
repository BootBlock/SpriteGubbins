# Icon / Symbol Set — audit and fix plan

> **Status:** 🟢 ACTIVE — phases 1 (the compiled prompt), 2 (the options), 3 (target models and the shape of a series) and 4 (the catalogue) landed; phase 5 open.

## 1. Why

The ICON category grew quickly: a catalogue of 36 groups with five looks each, custom icons, a
library per project, an overlay sheet and seven presets. An audit from four angles (the prompt's
self-consistency, the fields, the sheet plans and the target models) found that a compiled ICON
prompt disagrees with itself in several places, that several options never reach the artwork as
their guidance promises, and that a multiplayer cyberpunk game lacks options it needs: team-colour
tinting, HUD markers, pings, objectives and squad roles.

Each finding has an ID. A phase lands the findings it lists, and records any it defers or rejects
here with the reason. A finding is "confirmed" when it was seen in a compiled prompt or reproduced by
a test, and "plausible" otherwise.

## 2. Phases

| Phase | Theme | Findings |
| --- | --- | --- |
| 1 | The compiled prompt agrees with itself | P1–P12, B1–B6 |
| 2 | The options: overlay style, field clean-up, key safety, multiplayer cyberpunk options | O1–O14, M1–M4 |
| 3 | Target models and the shape of a series | T1–T8 |
| 4 | The catalogue's content, and the multiplayer cyberpunk groups | C1–C4, M5 |
| 5 | Studio, storage and quantise for icon sets, driven in a browser | U1 |

## 3. Findings

### Phase 1 — the compiled prompt

- **P1** (high, confirmed). Section 6 tells every sheet its components are "the same single subject"
  holding constant "primary colour blocking" and "joint and attachment geometry", and that a piece on
  another sheet must "read as the same object". An icon sheet's entries are different icons whose own
  colours outrank the set's; FONT glyphs, INTERFACE state libraries, TERRAIN blend sets and BACKGROUND
  layers are sets too. A sheet plan declares whether its components are one subject or members of one
  set, and section 6 states the rule for each.
- **P2** (high, confirmed). Section 3 holds every icon at object yaw 0° and calls a component turned
  for a better read a defect, while the category offers three-quarter and isometric icon styles and
  *Subject Framing* offers a diagonal pose. The one-sided-feature default, the primary assembly
  direction and pivot compatibility mean nothing on an icon sheet.
- **P3** (high, confirmed). The overlay sheet takes the icons' projection, so a square ring, a
  cooldown sweep and a veil clipped to the tile can come back foreshortened into diamonds. Full-bleed
  squares under an angled projection have the same risk.
- **P4** (medium, confirmed). The overlay sheet lists the icons' materials, colours, condition and
  detail in section 1 and says each is painted onto the component it sits on, so a cooldown wedge
  can arrive in forged steel and oiled leather.
- **P5** (medium, confirmed). The icon sheets' "no component on this sheet carries" the *Applied
  Overlay* sentence fights an entry or a *Condition & Finish* value that asks for the same element: a
  padlock that is the layout-lock icon, cracks asked for by `Cracked & Failing`.
- **P6** (high, confirmed). *Smallest Display Size* reaches section 1 as a bare line and nothing else.
  A 128 px drawing for a 32 px display is never told it is reduced four times, and the small-scale
  discipline fires only on the target component size.
- **P7** (medium, confirmed). Section 7 bans glow beyond a silhouette and any particle effect the
  inventory does not name, and overrules section 1, so it cancels *Motif Treatment* values
  (`Elemental Wisps Around The Subject`, `Neon Edge Light` on an isolated mark).
- **P8** (high; text confirmed, effect plausible). The overlay sheet's glows, halo and dimming veil
  are partial-alpha effects drawn over an opaque key, and nothing says the engine applies their
  opacity. A soft glow into a white key cannot keep clear of the key.
- **P9** (medium, confirmed). The icon sheets say every icon "is lit from the same direction" under
  lighting models that have no direction (`FLAT_NEUTRAL_ALBEDO`, unlit).
- **P10** (medium, confirmed). The resolution profile's "the largest component occupies 50–65% of
  its cell height … every other component is drawn to that same scale" fights the icon sheets' "each
  subject filling its square to the same margin" and *Subject Framing*.
- **P11** (medium, confirmed). Section 2's surface-detail line ("major panels and folds", "essential
  joints only") and the pixel discipline's ban on etched strokes and crosshatching contradict
  *Interior Detail* values the subject states.
- **P12** (low–medium, confirmed). Section 1 calls itself "the sole authority for the subject's
  design" and says a prop it does not list "does not exist", above an inventory of sixteen props it
  does not list; on ICON the "role" is the display size. Section 7's shadow ban leaves unclear whether
  a subject may shade its own full-bleed backdrop.
- **B1** (medium, confirmed). A cleared *World & Era* leaves every catalogue icon "drawn as the
  stated World & Era would make it" when section 1 states none (`utils/iconLookText.ts`).
- **B2** (low–medium, confirmed). The starter roster and four presets are not in catalogue order, so
  the first tick reorders icons the reader did not touch and moves sprites in a sheet already drawn.
- **B3** (low, confirmed). The roster parser checks capacity before it skips a duplicate, so a
  duplicate can drop a valid pick after it (`db/iconRosterParser.ts`).
- **B4** (low, confirmed). A reader's look ending in a full stop compiles as "..".
- **B5** (low, confirmed). A hex colour in a reader's look draws a lettering warning, not a key
  colour warning (`utils/customIconWarnings.ts`).
- **B6** (low, plausible). A hand-built roster with a repeated pick prints the icon twice; B2's fix
  closes it.

### Phase 2 — the options

- **O1** (high, confirmed). Seven of the twelve *Applied Overlay* values name a piece the fixed
  overlay library never draws, yet the overlay sheet says section 4 draws it, and the tooltip's
  "matched to" promise reaches no prompt. The field becomes the style the whole overlay library is
  drawn in; real extra pieces move to *Extra Overlay Pieces*.
- **O2** (high, confirmed). Both full-bleed cyberpunk presets ask for chrome on a `PURE_WHITE` key
  whose reach covers chrome's highlights; unhexed near-white options (`Chrome`, `Bone White`,
  `Pale Ice`, `Bleached Bone White`) are never measured against a key.
- **O3** (medium, confirmed). `isometric-map-marker-set` asks for `Etched Engraved Lines` under a
  pixel-art style that bans etched strokes.
- **O4** (medium, confirmed). *Interior Detail* restates the outline and lighting settings and can
  contradict them; `Woodcut Line Engraving` duplicates `Etched Engraved Lines`.
- **O5** (medium, confirmed). A fresh full-bleed set on the default magenta key is offered
  `Void Magenta #E879F9`, which that key reaches.
- **O6** (medium, confirmed). The *Explicit Exclusions* pool only restates the category's own line,
  and `No motion lines or sparkle trail` overrules `New Item Flare & Sparkle`.
- **O7** (medium, confirmed). `Elemental Wisps Around The Subject`, `Cropped Close On The Detail` and
  `Off-Centre Weighted Composition` break under the isolated-mark look.
- **O8** (medium–low). Overlay pieces are offered twice: `Tier Pip ×3` against the sheet's four tier
  marks, `Equipped Corner Tick` in two fields, `Stack Corner Plate` against `Quantity Corner Plate`.
- **O9** (medium–low). *Rarity Tier* mixes tiers with item states, and its tooltip describes a
  comparison a single set-wide value cannot make.
- **O10** (low–medium). *Condition & Finish* has duplicates, a material (`Factory-Fresh Chrome`) and
  a motion value a still cannot show (`Glitching & Flickering`).
- **O11** (low). Neon and hologram values repeat across four fields; *Subject Framing* and
  *Silhouette Discipline* overlap on orientation.
- **O12** (low–medium). Preset values disagree with their cards: the status badges come out cursed
  and cracked, the system buttons carry an equipped tick, the emote wheel is shown in social panels.
- **O13** (low). `Carved Rune & Sigil Accent` invites the letterforms the catalogue bans.
- **O14** (low). Wording slips in the overlay guard and the *Applied Overlay* tooltip's count.
- **M1**. A roster colour mode beside its look — full colour, or a neutral tint mask the engine
  multiplies a team or faction colour over — for multiplayer sets.
- **M2**. Tier marks told apart by shape and pip count, never by colour alone.
- **M3**. Field values for multiplayer cyberpunk HUDs: where the set is shown (HUD and compass,
  ping wheel, killfeed and scoreboard, cyberware slots, quickhack bar, lobby and loadout, party and
  squad frames), 16 and 20 px display sizes, silhouette readable without colour, a drawable glitch
  finish, key-safe colours, an emissive no-material surface, exclusions (baked team colour, real
  logos, gore, hue as the only difference) and HUD overlay pieces (off-screen arrow, height arrows,
  ping acknowledged, hostile chevron).
- **M4**. Presets: cyberpunk squad HUD markers and cyberpunk loadout slots, built from the existing
  catalogue.

### Phase 3 — target models and the shape of a series

- **T1** (medium, confirmed). `TRANSPARENT` is never checked against what the target can deliver; no
  target declares an alpha capability.
- **T2** (medium, confirmed). Midjourney never negates frame or border on icon sheets, because the
  decision is per category rather than per sheet, and never gets ICON's assembly negatives.
- **T3** (medium; text confirmed). The Sol hand-off protects the object yaws on a front-only icon
  sheet and leaves the colours, the display size and the target size unprotected.
- **T4** (low–medium, confirmed). Seedream's keep list omits the inventory; Qwen's budget counts the
  negative block that goes in its own field, and several ICON prompts exceed it.
- **T5** (medium; text confirmed). Icon size is not anchored across the sheets of a series: a short
  last sheet of two icons draws them twice as large. The split should balance.
- **T6** (medium). The overlay sheet is sheet 1, matched to icons that do not yet exist.
- **T7** (low). SD's and Qwen's `cropped` negatives fight `Cropped Close On The Detail`.
- **T8** (low). Extra overlay pieces can push the overlay sheet past the component ceiling with only
  the general budget notice, and a piece named like a fixed one is renamed silently.

### Phase 4 — the catalogue

- **C1** (medium, confirmed). The cyberpunk restoratives and boosts draw nine of sixteen icons as
  injector pens, told apart mostly by hue, which fails a red–green colour-blind player.
- **C2**. Audit every group's five looks for distinct silhouettes per slot, colours inside key reach,
  words inviting lettering, and figures not declared.
- **C3**. The `LETTERING_OBJECTS` rune ban against motif options (with O13).
- **C4**. The lighting rationale "so a game engine can light the sprite itself" is false for UI icons,
  which the engine never lights; ICON's default lighting should be baked.
- **M5**. New groups for multiplayer cyberpunk games: pings and callouts, objectives and zones,
  killfeed and scoreboard marks, squad roles, cyberware slots, quickhacks, heat and standing, and
  faction archetypes, each writing all five looks.

### Phase 5 — studio, storage and quantise

- **U1**. Audit the catalogue dialog, custom icons, the project library, the roster summary, the
  stores and both storage backends, and the quantiser's 128 px resize and sprite pack for icon sets;
  drive each in a browser.

## 4. Progress

- **P1** landed in `0f595f0b`.
- **P2, P3, P4, P5 and P12** landed in “Pose each icon beneath the set’s one camera, and lay the
  overlay pieces flat”.
- **P6, P7, P8, P9, P10 and P11** landed in “State how far an icon set is reduced, and stop sections 2
  and 7 overruling what it asks for”.
- **B1, B2, B3, B4, B5 and B6** landed in “Keep every icon roster in shelving order, and name no world
  a cleared World & Era does not state”, with the identity lock’s copy made true of a set’s series.
- **O6** is half landed with B1–B6: the `sparkle` pairing in `src/constants/categories/exclusionElements.ts`
  reports `No motion lines or sparkle trail` against `New Item Flare & Sparkle` as a contradiction. The
  pool restating the category’s own line stays open for phase 2.
- The review of phase 1 landed in “Fix the review findings on the icon set audit’s phase 1”, as part of
  three findings. **P7**: section 7 reads section 1 apart from its *Applied Overlay* line on an icon
  sheet, so the overlay’s glow and sparkle are not handed back to every icon. **P6**: the reduction is
  the one scale a drawing fits its display at, so a drawn size and a display of different shapes state
  the right fraction and floors. **P12**: no wrapper negates a shadow a subject casts inside its
  full-bleed square; a drop shadow, outside it, stays negated.
- **O1–O14 and M1–M4** landed in “Draw the overlay library in one style, keep every colour clear of
  its key, and colour a multiplayer set by team”, which finishes **O6**.
  - **O1**: the field is *Overlay Style*, the style every overlay piece is drawn in. Its entries are
    `'DRAWN_IN_IT'`, so the overlay sheet’s section 1 and section 7 say so, and an icon sheet leaves the
    style to it. Equipped ticks, quantity plates and set rings are *Extra Overlay Pieces*.
  - **O5** reached past ICON. The default magenta key reached `#E879F9` on FONT, INTERFACE and BACKGROUND
    too, and the Cyberpunk City Parallax preset painted with it, so every pool is now held to the default
    key. **O2**’s rule covers the colour pools and the white-keyed presets’ fields. The catalogue’s looks
    still name chrome on the two white-keyed presets, which is **C2**’s to decide.
  - **M1**: a tint mask is `IconRoster.colourMode`, `SheetPlan.tint` on the icon sheets, and a key the
    studio, the compiler and the store resolve off `PURE_WHITE` (`backgroundKeysFor`). The overlay
    sheet keeps its colours, since its pieces mark a state rather than a side.
  - **M3** names the off-screen arrow *Edge-Of-View Pointer*, because ICON’s negatives ban “screen”.
  - **O7** removed `Cropped Close On The Detail`, so **T7** has no option left to fight; phase 3 confirms
    that and closes it.
- The review of phase 2 landed in “Draw a tint mask under no fixed palette, and key every reader to the
  sheet’s own key”, as three findings on **M1** and its docblocks. **The palette**: a tint mask takes no
  pinned palette, because its neutral greys contradicted a palette such as `GAME_BOY_DMG`, which has no
  grey. `palettesFor` offers it only `FREE`, and the compiler, the studio’s digests, the Palette control,
  the colour budget and the store resolve the palette through it, as they resolve the key. **The
  readers**: the Quantise tab and its capture button read the key and the palette resolved through the
  subject (`useResolvedBackgroundKey`, `useResolvedPalette`), not as stored, and the custom icon form and
  the identity palette capture read the key that way. **The docblocks**: three that named three
  attribute roles or a removed motif option now state the four roles and `Carved Knotwork Inlay`.
- The second review of phase 2 landed in “Name no colour in an overlay style, and make the tint mask’s
  docblocks name the palette”. **O1**: three *Overlay Style* values named a colour of their own, which
  section 1’s accent sentence for the overlay sheet forbids, so they are now `Filigree Scrollwork Trim`,
  `Writhing Tendril Edges` and `Faceted Crystal Shards`. **O2**: the *Primary Colours* card no longer
  claims the studio checks its colours against the key. **M1**: four docblocks name the palette a tint
  mask withdraws.
- **T1–T8** landed in phase 3, in “Check transparency against the target, and say more to Midjourney,
  Sol, Seedream and the budget” (T1–T4) and “Cut an icon set into even sheets, close it with the
  overlay sheet, and say what the extra pieces do” (T5, T6, T8).
  - **T7** was closed without a change: **O7** removed `Cropped Close On The Detail`, and no option,
    preset, test or prompt text names a crop on ICON any more, so Stable Diffusion's `cropped` and
    Qwen's `cropped components` have nothing to fight.
  - **T1**: every target declares `TargetCapabilities.alpha`, cited to its vendor. Only OpenAI document
    an alpha channel: the Images API through the `background` request option, and the image tool Sol
    calls through the same option. Seedream documents one for image-to-image work alone, so it counts
    as none. `backgroundKeysFor` withdraws `TRANSPARENT` from every target that documents none, the key
    resolves through the subject and the target, the Target AI Generator control moves a stored key in
    the same act, Sol is told to set the tool’s option, and the Background Key control states what a
    GPT Image request must set. Nine presets that paired `TRANSPARENT` with such a target take magenta.
  - **T2**: `SheetPlan.frames` makes Midjourney’s frame decision per sheet. The overlay sheet declares it,
    and so does an icon sheet whose entry names a frame or a border (`namesAFrame`); every other icon
    sheet negates `frame, border`. `--no` opens with the category’s assembly terms.
  - **T3**: Sol’s hand-off protects section 1’s colours and section 2’s target size and smallest display
    size wherever the prompt states them, on every category.
  - **T4**: Seedream’s keep list names the inventory, and names a direction only on a sheet of views.
    The budget notice measures `promptFieldText`, the text a target reads in its prompt field, so Qwen’s
    and Stable Diffusion’s negative blocks no longer count against the figure.
  - **T5**: `balancedChunks` cuts the roster into as few icon sheets as before and as evenly as the
    two-state pairs allow, and every icon sheet states one cell, 1/4 of the sheet’s width, so a short
    sheet leaves canvas empty rather than drawing its icons larger.
  - **T6**: the overlay sheet closes the series and declares `SheetPlan.anatomy`, so the *Extra Overlay
    Pieces* are drawn on it wherever it falls. With an icon sheet now first, the contract-item check
    compiled a full-bleed square at sheet index 0 for the first time, and found its backdrop item citing
    sections 1 and 2 by number, which an image model reached through Sol’s hand-off cannot look up; both
    citations are gone.
  - **T8**: the overlay sheet keeps its size, and the *Extra Overlay Pieces* field says under itself when
    a piece repeats one the sheet already draws, or when the pieces push it past
    `PRACTICAL_COMPONENT_CEILING` (`additionalAnatomyNote`, on every category’s field).
- The review of phase 3 landed in “Fit an icon sheet’s native grid to its cells, and make the series
  order true everywhere it is stated”. **T5**: the native-grid scale was fitted to each sheet’s own
  drawings, so a pixel-art sheet of two icons asked for 14× or more, an icon wider than the cell the
  same prompt fixes; an icon sheet declares `SheetPlan.cells`, and every icon sheet of a set takes one
  scale. **T6**: the specification, the roster summary (“2 icon sheets and the overlay sheet”), the
  modes table and several test comments still put the overlay sheet first. **T1**: the Background Key
  card and the `TRANSPARENT` label no longer hedge a case the list now filters out, and Sol’s request
  is gated on `AlphaDelivery`’s `TOOL_CALL`. **T2**: three tests that chose their sheet with the
  function under test, or matched a word the exclusions always carry, now state what they expect.
- The landing of phase 3 found one compile of an ICON set some forty times the cost of a character’s,
  which put the typographic-marks sweep past its 30-second limit on CI. Every reader asks for the series
  by the subject, several times for each sheet `describeSeries` lists, and `iconSeries` rebuilt the
  roster’s every line and sheet each time. It now builds a roster’s series once for each *World & Era*
  and shares it, and `lookFamilyOfWorld` reads a map. The sweep takes about 3 seconds against 7.5 to
  10 on `main`.
- **C1–C4 and M5** landed in phase 4, in “Give every icon its own outline, keep chrome off the white
  key, and shelve what a multiplayer cyberpunk game needs”.
  - **C1**: the cyberpunk action bar’s nine injector pens are now an injector ladder for health and, for
    the rest, a jack plug, a cartridge, a can, an inhaler, a nasal spray, a med-kit case, a servo
    gauntlet, a nerve coil and an ankle brace. The fantasy, age-of-steam and space-opera restoratives
    and boosts had the same fault, vials and capsules told apart by hue, and were redrawn the same way.
    `lookObject` (in `src/test/`) reads the object a look is drawn as, and two tests hold it: no two
    entries of a shelf share an object in any family, and no preset draws two of its icons as one
    object across shelves. `ONE_OBJECT_SETS` names the shared objects that differ by a drawn mark — the
    tier ladders, the quest giver’s star against its tick, the vendor against the buyback — and chat,
    emotes and pet commands are one carrier marked differently by convention. The spellbook preset had
    the same fault, three strikes drawn as one bullet, and its thermal and cryo strikes now differ.
  - **C2**: every group’s five looks were swept, and about a hundred shared objects were redrawn across
    the shelves. **The chrome O5 left open is decided against**: chrome’s mirror highlights reach the
    white key, as ivory, cream and frost do outright, so no cyberpunk look names a near-white word, and
    the two hundred that named chrome name brushed steel, black steel or gunmetal. `NEAR_WHITE_WORDS` is
    the white key’s words for the catalogue, the presets’ key test and the warnings on a reader’s own
    icons, and `wordNamed` now counts a colour’s endings (`whitish`, `frosted`) and spares a word that
    only starts alike (`palette`, `paladin`). A writing surface — a map, a chart, a monitor —
    must be called blank, plain, closed or rolled (`WRITING_SURFACE`, which replaces the scroll rule),
    and a banknote, a dog tag and a compass rose join the objects that bring markings with them. The
    figure audit found no undeclared person: the body words in non-figure looks belong to animals and
    machines, and `palm-sized` and `thumb-drive` are idioms.
  - **C3**: `LETTERING_OBJECTS` bans a sigil and a glyph beside the rune. Other categories draw them as
    carved ornament (`letteringMarks.ts`), but an icon is read at 16 to 32 px, where an ornament and a
    letter are one shape. Every look that named a sigil now names the picture it showed. The
    options of every field that describes the drawing are held to the catalogue’s rules too, which
    renamed `Moulded Polymer & LED Strip` to `Moulded Polymer & Light Strip`, since a model letters an
    acronym onto the object. *Where The Set Is Shown* is exempt: it names a screen, never a drawing.
  - **C4**: flat neutral lighting states its reason by category. An icon set, an interface kit and a
    font are drawn over the game, where no engine light reaches them (`DRAWN_OVER_THE_GAME`), so their
    prompts say the artwork looks the same wherever the interface places it, and the *Lighting Model*
    card and its `FLAT_NEUTRAL_ALBEDO` label no longer call it the engine-lit standard. **ICON’s default
    lighting is not changed**: the studio has no per-category default for any output control, every
    claim a category makes is a refusal of a value it cannot honour, and flat lighting is an honest
    look for an icon that two shipped presets take. The five presets that want a baked key light set one.
  - **M5**: eight shelves, each writing all five looks — *Pings and callouts*, *Objectives and zones*,
    *Killfeed and scoreboard*, *Squad roles*, and *Heat and standing* among the system icons beside the
    map pins and the combat status, *Cyberware slots* beside the equipment slots, *Quickhacks* as
    spells, each in the school of its effect, and *Faction archetypes* as social emblems. A capture point
    is drawn whole and broken, and the four standings are a spiked triangle, a ring, a shield and a star,
    so neither reads by colour alone. The shipped presets are unchanged; a squad HUD set can now tick
    pings and objectives rather than map pins.
