import type { SubjectCategory } from '../../types/subject.ts';

/**
 * What the exclusions section bans, per category.
 *
 * This used to be one static line naming "backgrounds, environments, ground planes, floor tiles,
 * terrain, sky, props and scenery" for every sheet — including a building tileset, whose entire
 * inventory *is* floor tiles. That prompt required floor tiles in section 4 and prohibited them in
 * section 8, and a generator resolving the contradiction either way produced a sheet the other half
 * of the prompt called a failure.
 *
 * So the environment ban is stated by the categories for which an environment really is scenery, and
 * BUILDING and TERRAIN ban the things that are foreign to *them* instead. Same mechanism as the
 * inventory: the category owns its own rules rather than inheriting another's.
 */
export const CATEGORY_EXCLUSION_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, architectural modules, and any prop or equipment section [SEC:SUBJECT] does not name.',
  CREATURE:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, architectural modules, riders, handlers and any harness section [SEC:SUBJECT] does not name.',
  OBJECT:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, and any character, creature or hand interacting with the object.',
  ITEM: 'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, and any character, creature or hand holding the item.',
  // No environment ban: this category's components *are* the environment. What is foreign to a
  // building sheet is the inhabitants and their belongings, so those are what it excludes.
  BUILDING:
    'Characters, creatures, vehicles, loose props and clutter; sky, distant landscape and any backdrop behind the structure; and cast shadow onto the ground.',
  // The road surface is named alongside the ground plane because it is the one a vehicle attracts:
  // asked for a tank, a generator that has resisted every other backdrop will still lay a strip of
  // tarmac under the tracks. The motion and exhaust ban is this category's own: both are drawn
  // *outside* the vehicle's silhouette, so either one turns an extractable component into one that
  // bleeds past its cell.
  VEHICLE:
    'Backgrounds, environments, ground planes, road or runway surfaces, terrain, sky, scenery; any driver, pilot, crew or passenger; and any exhaust plume, dust trail, wake, motion blur, speed line or weapon effect.',
  // The *source* is this category's own hazard, and it is the one every other category never has:
  // asked for a muzzle flash, a generator draws the gun behind it; asked for an impact spark, it
  // draws the thing being hit. Neither is scenery, so the environment ban would not have caught it.
  // Note what is deliberately absent here — no ban on glow, emission, sparks or "effects", which
  // VEHICLE's line carries in as many words and which would forbid this sheet's entire subject.
  //
  // **Section 8's own static line had to give way for the same reason**, and that edit is part of
  // this category rather than incidental to it: it read "…glow bleeding beyond a component's
  // silhouette, particle effects", which was true of six categories and became false the moment a
  // seventh could ask for a spark shower in section 4 and be told in section 8 that particle effects
  // were absent from the image entirely. It is now qualified — "any particle effect the inventory in
  // section 4 does not name" — which is the same repair VEHICLE's audit line took, and which leaves
  // the ban exactly as strong for the six whose inventories name none.
  //
  // **Every noun in the source ban is bound to its own relation, and the closing sentence names the
  // effect types that collide with one.** The ban began as a seven-noun list with a single modifier
  // trailing all of it — "any character, creature, hand, weapon, muzzle, projectile or object the
  // effect plays against or issues from" — which is the weakest attachment English offers, and this
  // is the category that cannot afford it: an effect is usually *named after* what it comes out of,
  // so four of the nine `Effect Type` options this app offers share a word with that
  // list. `Muzzle Flash / Discharge` against "muzzle", `Slash / Weapon Trail` against "weapon",
  // `Projectile Body & Trail` against "projectile", and `Environmental Ambience` against
  // "environments" at the head of the line. Section 1 is the sole authority for the subject's
  // design, so a reader matching on the noun finds the subject itself named in the exclusions —
  // and section 8 now closes by saying an attribute above that names an excluded element is already
  // overruled, which is the instruction that reading was previously missing.
  // `exclusions.test.ts` derives those four from the pool rather than listing them, so a tenth
  // option named after a banned noun fails the build until this sentence names it too.
  //
  // **The closing sentence answers each of the four on its own ground**, which is why it is two
  // clauses rather than one. Three are named after a *source* and are rescued by saying the source
  // is what is absent; `Environmental Ambience` is not — it collides with "environments" in the
  // scenery clause at the head of the line, which bans a backdrop rather than a source, so a single
  // "never its source" would have named it and then answered a question nobody asked.
  EFFECT:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; whatever the effect issues from or lands on — character, creature, hand, weapon, muzzle, launcher, projectile or struck surface; any damage number, health bar, cursor or other interface element; and any lens flare. A muzzle flash, weapon trail or projectile body is the effect itself and is drawn, never the source it is named after; an environmental ambience is the drifting motes, never the setting they drift in.',
  // The lettering ban is this category's own, and it is the one exclusion here that repeats section 0
  // deliberately. Every real-world member of this category is labelled, so a generator asked for a
  // button has to be told twice that the words go on at runtime — an atlas with "CONFIRM" baked into
  // a sprite can only ever be used for that one string, in that one language.
  INTERFACE:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any character, creature or hand reaching for the interface; any gameplay art, portrait or map inside a frame; and any lettering, numeral, caption or legend on a component.',
  // No environment ban either, and for a sharper version of BUILDING's reason: the ground plane the
  // other five categories forbid is this one's entire deliverable. The landmark clause is scoped to
  // tiles meant to repeat, because the feature library's focal outcrop is deliberately distinctive
  // and is placed once.
  //
  // **The composed-landscape clause used to sit in the middle of this line and has moved to
  // `CATEGORY_ASSEMBLY`**, which now supplies the fourth bullet of the list this line opens. What a
  // terrain sheet attracts is a view of the ground instead of separable tiles, and that is this
  // category's assembly failure rather than a second kind of scenery — it was written here only
  // because this was the one record that had a per-category line to write it in. Leaving it in both
  // would have section 8 excluding one thing twice in one list, in two wordings, three bullets apart
  // — which is far enough that neither copy looks like a restatement of the other.
  TERRAIN:
    'Characters, creatures, vehicles, buildings and their fittings; sky, horizon and distant landscape; and, on any tile meant to repeat, a landmark distinctive enough to be recognised twice across a laid field.',
  // The name plate is this category’s own, and it repeats section 0 deliberately for the reason
  // INTERFACE’s lettering ban does: every real dialogue portrait is shown beside a name, so a
  // generator asked for one has to be told twice that the words go on at runtime. The second-person
  // ban is the other one no other category needs — a portrait prompt attracts the conversation it
  // is drawn for, and an over-the-shoulder figure is neither scenery nor a prop.
  PORTRAIT:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any second person or hand, and anything drawn over the sitter’s shoulder; any prop, weapon or held object entering the crop; any speech bubble, name plate, caption or dialogue box; and any decorative frame, vignette or border around the head.',
  // The lettering ban is stated in full rather than by reference, and it is the sharpest version of
  // it in this record: a stack count, a cooldown and a keybind are the three things a real icon
  // appears to carry and the three an engine draws at runtime. The plate ban is this category’s
  // boundary with INTERFACE — an icon is the mark, and the slot it sits in belongs to the other
  // sheet.
  ICON: 'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any hand, character or creature holding or presenting the subject; any slot plate, tooltip or interface panel drawn behind or around a component; and any lettering, numeral, stack count, timer or key name on a component. A selected ring, a highlight halo and a tier mark are components of this sheet, each drawn clear in its own cell for the engine to lay over an icon; an input prompt is the blank cap or button shape the engine writes a binding onto, never the key name it is named after.',
  // No environment ban, for a third version of BUILDING’s reason: the scenery the other categories
  // forbid is this one’s entire deliverable. What is foreign to a backdrop is the *playfield* — the
  // things a player acts on — and playable geometry is named first because it is the one that costs
  // a bug report rather than a redraw: a ledge painted into the far band is a ledge somebody will
  // try to stand on. The seam clause is scoped to bands meant to loop, exactly as TERRAIN’s landmark
  // clause is scoped to tiles meant to repeat, because the layer library’s panels do not loop at
  // all.
  BACKGROUND:
    'Any character, creature or vehicle drawn at the playfield’s own scale, or near enough the camera to read as an actor rather than as scenery; any platform, ledge, walkway or other geometry a player could stand on or collide with; any pickup, door or interactive object; interface, logo and lettering; and, on any band meant to loop, a visible join where it repeats or a landmark distinctive enough to be recognised twice across a scroll. A bird at distance, a wrecked hull, a derelict station on the horizon and anything else the inventory in section [SEC:INVENTORY] names are scenery, and are drawn.',
  // The one category whose line ends by *rescuing* something the list it sits in would otherwise
  // take, which is BACKGROUND's move and matters more here than anywhere: this bullet's own list
  // sits three lines above one saying the only lettering permitted is the inventory's, and without
  // the closing sentence a reader meets both immediately before an inventory of ninety-four letters.
  //
  // **Where the caption ban went is the half worth recording.** A draft ended this line with “any
  // caption, key, index number or codepoint written beside a component to name it” — which is
  // exactly what the conditional bullet further down the same list now says, and a list stating one
  // thing twice in two wordings is the duplication `CategoryAssembly.exclusion` is written against.
  // The template's own bullet is the right home for it, because that boundary is the *contract's*
  // rather than this category's.
  FONT: 'Backgrounds, environments, ground planes, terrain, sky and scenery; any page, card, panel, plate or ruled line drawn behind or beneath a component; any hand, quill, brush or nib drawing the letters; and any decorative flourish, swash or ornament the inventory in section [SEC:INVENTORY] does not name. The characters the inventory names are the subject of the sheet, and are drawn.',
};

/**
 * The category guard section 4 carries — a plain statement of what the inventory may contain.
 *
 * Defence in depth, and deliberately cheap: the plan tables already make a contaminated inventory
 * unrepresentable, so this is not what prevents the bug. It is what makes a future one *visible* —
 * if an inventory ever again described another category's components, this sentence sits directly
 * above it saying so, and a reasoning target can act on the contradiction rather than dutifully
 * drawing walls for a character.
 */
export const CATEGORY_GUARD_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Every entry below is character anatomy. An entry describing a floor tile, wall, terrain piece, building module or other environment component does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  CREATURE:
    'Every entry below is creature anatomy. An entry describing a floor tile, wall, terrain piece, building module or other environment component does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  OBJECT:
    'Every entry below is a part of this one object. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  ITEM: 'Every entry below is a part of this one item. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  BUILDING:
    'Every entry below is a structural or tile component. An entry describing a head, limb, hand or other anatomy does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  VEHICLE:
    'Every entry below is a part of this one vehicle. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // The one guard that has to name the exception, because this is the one category whose additional
  // elements are *not* the same kind of thing as its components. A character's extra horn is still
  // anatomy and a vehicle's extra pod is still a part, so "every entry below is anatomy" stays true
  // above the appended block in both. An effect's shockwave ring and scorch decal are not frames —
  // section 4's own additional-anatomy block lists and counts them right below this sentence, so an
  // unqualified "every entry below is a frame" would call the sheet's last components an error in
  // the specification, which is exactly what the sentence tells the reader to act on.
  EFFECT:
    'Every entry below is one frame of this one effect’s sequence — a moment in time, not a piece of a machine — apart from the additional elements the subject itself named, which are listed and counted separately at the end. An entry describing anatomy, a housing, a hatch, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // The second sentence is this category's alone, and it is load-bearing rather than reassurance:
  // this is the one subject whose components *are* frames and borders, and section 0 forbids drawing
  // one around the image or around a component. Those are two different things, and saying so where
  // the inventory is about to list a panel frame is what stops a generator resolving the apparent
  // conflict by delivering a panel with no edge.
  INTERFACE:
    'Every entry below is a piece of this one interface. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow. The frames, borders and panel edges it does list are components — the subject of the sheet, not the annotation section [SEC:CONTRACT] forbids.',
  TERRAIN:
    'Every entry below is a ground tile or a landform piece. An entry describing anatomy, a wall, a roof, a building module or a vehicle part does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // “One expression of this one person” rather than “portrait anatomy”, because the failure this
  // sheet actually has is twelve competent portraits of twelve different people — which “anatomy”
  // would not name at all. The floor-tile clause is the shared half every guard carries.
  PORTRAIT:
    'Every entry below is one expression of this one person’s portrait, drawn to the same crop as the rest. An entry describing a floor tile, a wall, a terrain piece, a building module or a second person does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // The second sentence is this category’s own and is load-bearing rather than reassurance: an icon
  // set’s inventory names overlays and marks that sit on top of an icon, and section 0 forbids
  // annotation drawn over the image. Those are two different things, and saying so where the
  // inventory is about to list a locked mark is what stops a generator resolving the apparent
  // conflict by omitting the overlays.
  ICON: 'Every entry below is one member of this one icon set, or a piece laid over one. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow. The overlays and marks it does list are components — the subject of the sheet, not the annotation section [SEC:CONTRACT] forbids.',
  BACKGROUND:
    'Every entry below is a band of this one backdrop, or a loose piece laid over one. An entry describing anatomy, a wall the player walks against, a platform, a vehicle part or an interface element does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // The second sentence is this category's own and is the load-bearing one in the whole record: it is
  // the only place in a compiled prompt where the reader is told, at the point of listing ninety-four
  // letters, that the lettering below is the subject rather than the thing section 0 forbids.
  // INTERFACE's and ICON's guards make the same move for frames and overlays; this one makes it for
  // the ban those two only ever strengthened.
  FONT: 'Every entry below is one character of this one font. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow. The letters, digits and marks it does list are components — the subject of the sheet, and the one thing section [SEC:CONTRACT] permits it to carry — not the annotation that section forbids.',
};

/**
 * The category check the self-audit adds.
 *
 * The audit was entirely generic — count, background, text, order, camera — so it verified that a
 * sheet was *well-formed* without ever asking whether it was the right subject. A character sheet
 * that came back as sixteen wall tiles passed every one of those checks.
 */
export const CATEGORY_AUDIT_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Every component is character anatomy — no floor tiles, walls, terrain, building modules or scenery anywhere on the sheet.',
  CREATURE:
    'Every component is creature anatomy — no floor tiles, walls, terrain, building modules or scenery anywhere on the sheet.',
  OBJECT: 'Every component is a part of this one object — no anatomy, tiles, terrain or scenery.',
  ITEM: 'Every component is a part of this one item — no anatomy, tiles, terrain or scenery.',
  BUILDING:
    'Every component is a structural or tile piece — no characters, creatures, anatomy or loose props.',
  // Every noun here carries its own qualifier, and that is load-bearing rather than wordy: the part
  // library asks for an "exhaust or vent" as a component, so an audit reading "no exhaust" would
  // fail the sheet on an entry section 4 required. The exclusion above states the same ban and gets it
  // right; this line dropped the qualifiers and reintroduced the §4-requires/§9-forbids
  // contradiction these per-category records exist to remove.
  VEHICLE:
    'Every component is a part of this one vehicle — no anatomy, tiles, terrain, scenery or crew, and no exhaust plume, dust trail, wake or motion effect drawn as though it were a component.',
  // Qualified the way VEHICLE's is, and for the same reason: this sheet's components *are* sparks,
  // smoke and glow, so an unqualified "no effects" would fail every sheet on the entries section 4
  // required. What is checked instead is that nothing the effect plays against got drawn with it,
  // and that consecutive frames actually differ — the failure this category can have and no other.
  // Carries the same exception as the guard above, and for the sharper reason: this line is a *check
  // the reader performs*, so an audit reading "every component is a frame" fails the sheet on the
  // scorch decal section 4 required — five of the eight shipped EFFECT presets name one. The
  // qualifiers throughout are load-bearing exactly as VEHICLE's are.
  //
  // **The source ban took the same repair the exclusion above did, the other way round.** This line
  // is a check the reader *performs* before delivering, so a bare "no weapon" read against a
  // `Slash / Weapon Trail` sheet fails the sheet on its own subject. It states the *relation* and
  // drops the nouns entirely rather than naming them and then rescuing each one: an audit is a list
  // of things to look for, and the exclusion above is where the vocabulary belongs. So the derived
  // check in `exclusions.test.ts` finds nothing to rescue here, which is the stronger of the two
  // positions rather than a gap — putting a noun list back puts the collisions back and fails it.
  EFFECT:
    'Every component is a frame of this one effect, or one of the additional elements the subject named — no anatomy, machine parts, tiles, terrain or scenery, and nothing the effect issues from or lands on. No two frames are the same drawing at a different brightness, scale, rotation or mirroring.',
  // "No floor or terrain tiles" rather than "no tiles", for the same reason VEHICLE's line qualifies
  // every noun in it: a nine-slice sheet's components *are* tiles, so an audit reading "no tiles"
  // would fail a sheet on the entries section 4 required.
  INTERFACE:
    'Every component is a piece of this one interface — no anatomy, floor or terrain tiles, scenery, or gameplay art inside a frame — and no component carries lettering, a numeral or a caption.',
  // The second half is this category's own, and it is the check no generic audit can stand in for: a
  // terrain sheet can pass every count, background and ordering test and still be unusable, because
  // seamlessness only shows up when the tiles are laid together. It is stated as an agreement about
  // *edges* rather than as "every tile butts against its own copy", which would be this record's
  // VEHICLE mistake again — a transition tile carries a boundary, so it cannot meet its own copy
  // without a seam, and an audit demanding that fails the sheet on the fourteen tiles section 4
  // requires.
  //
  // **The landscape-view clause has moved to `CATEGORY_ASSEMBLY`**, which supplies the check two
  // items above this one in the same list — the one-camera check sits between them — for the reason
  // the same clause left `CATEGORY_EXCLUSION_TEXT`: it is this category's assembly failure rather than
  // a subject check, and this record was only ever where a per-category line existed to hold it.
  TERRAIN:
    'Every component is a ground tile or a landform piece — no characters, creatures, anatomy, buildings or vehicles. Every tile edge carrying a given material is drawn to the same profile wherever it appears, so any two tiles meeting on that material show no seam, and no tile carries a mark that would be recognised twice across a field.',
  // The second half is this category’s own and is the check no generic audit can stand in for: a
  // portrait sheet can pass every count, background and ordering test and still be unusable, because
  // whether it is one person only shows up when the drawings are compared with each other. It is
  // stated as an agreement between the expressions rather than as “every component is identical”,
  // which would be this record’s VEHICLE mistake again — the expressions are meant to differ, and an
  // audit demanding they do not fails the sheet on the twelve drawings section 4 requires.
  PORTRAIT:
    'Every component is one expression of this one person — no second figure, no scenery, no anatomy below the stated crop, and no name plate, caption or speech bubble. Any two expressions are recognisably the same person, drawn to the same crop with the eyes at the same height, differing only in what the feeling itself moves.',
  // Qualified throughout, as VEHICLE’s and INTERFACE’s are: this sheet’s components include marks
  // and overlays, so an unqualified “no marks” would fail it on the entries section 4 required. The
  // second half is the check this deliverable actually needs — an icon grid fails by disagreeing
  // with itself about weight and margin, and that only shows when the members are seen together.
  ICON: 'Every component is a member of this one icon set or a piece laid over one — no anatomy, floor or terrain tiles, scenery, and no interface panel or slot plate drawn behind an icon — and no component carries a letter, a numeral, a stack count or a key name. Every icon fills the same cell to the same margin at the same outline weight and under the same light, so no member reads as belonging to a different set.',
  // The seam check is scoped to bands meant to loop for the reason TERRAIN’s edge check is scoped to
  // tiles: the layer library’s panels do not loop, and an audit demanding a seamless join would fail
  // that sheet on the six pieces section 4 requires.
  BACKGROUND:
    'Every component is a band of this one backdrop or a loose piece laid over one — nothing drawn at the playfield’s own scale, no interface or lettering, and nothing a player could mistake for a platform, a ledge or a pickup. Every band meant to loop carries the same profile, materials and values at its left edge as at its right, so a run of it shows no join, and no looping band carries a mark that would be recognised twice across a scroll.',
  // Qualified throughout, as VEHICLE's and ICON's are, and here the qualifier does the most work in
  // the record: every component of this sheet *is* lettering, so an unqualified “no lettering” — the
  // clause BACKGROUND's line above carries — would fail the sheet on all ninety-four entries section 4
  // required. The caption clause is deliberately absent for the reason `CATEGORY_EXCLUSION_TEXT`'s
  // FONT line gives: the conditional text check two items above this one in the same list already
  // states it, and this record may not restate what sits beside it.
  //
  // The second half is the check no generic audit can stand in for: a font sheet passes every count,
  // background and ordering test and is still unusable if one glyph sits a pixel off the baseline,
  // and that only shows when the characters are compared with each other.
  FONT: 'Every component is one character of this one font — no anatomy, tiles, terrain or scenery, and no page, plate or panel drawn behind a component. Every character stands on the same baseline at the same cap height and stroke weight under the same light, so no component reads as belonging to a different font.',
};

/**
 * Whether a frame or a border can be a *component* of this category's sheet rather than annotation
 * drawn around one.
 *
 * Read in exactly one place, and it exists because that place cannot say what section 0 says.
 * Midjourney's `--no` takes things to avoid — a multi-word entry is read as one of them, but never
 * as a *placement* — so the wrapper cannot express "no border **around the image or around a
 * component**", which is a relation to the rest of the sheet rather than a thing. The term is either
 * in the negative prompt and suppressing the subject, or out of it. For every category but one a
 * border is only ever the decorative surround a generator adds to a reference sheet, and excluding
 * it does real work; for INTERFACE it is the panel edge the sheet exists to draw, and `--no border`
 * would return a kit of frames with no frames in it.
 *
 * A record rather than a check on the category at the call site, for the reason every per-category
 * fact in this file is one: the next category is a compile error here until somebody answers for it,
 * where a `category === 'INTERFACE'` would silently answer for it wrongly.
 */
export const FRAME_IS_A_COMPONENT: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: false,
  CREATURE: false,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: false,
  // An effect is drawn as light and particles, never as an edge around something, so a border on one
  // of its frames is the decorative surround this term exists to suppress.
  EFFECT: false,
  INTERFACE: true,
  // A terrain tile has edges but no *border*: the boundary between two materials is painted across
  // the tile, never drawn round it, so a frame on one is the decorative surround this term suppresses.
  TERRAIN: false,
  // A portrait is cropped, not framed. Its own exclusions ban a vignette or a decorative border round
  // the head for exactly that reason, so a border on one is the surround this term exists to
  // suppress.
  PORTRAIT: false,
  // INTERFACE's answer, for INTERFACE's reason, and it took a review pass to get here. The *plate*
  // an icon sits in is genuinely that category's component and this one's exclusions ban it, which
  // is what made `false` look right. But `ICON_SYMBOL_SET`'s state group requires a selected ring
  // and a highlight halo, and those are edges around something by construction: `--no border`
  // suppresses exactly them, and `--no` cannot express the placement that would separate an edge the
  // sheet requires from a surround a generator adds. The rule `modelWrapperText/midjourney.ts`
  // states for this term is that it stays out wherever excluding it would take the sheet's own
  // subject with it, and one of this sheet's three groups is that subject.
  ICON: true,
  // A band has edges but no border: it is cut to a strip and butted against its own copy, so a frame
  // drawn round one is the surround this term suppresses — and a border would sit exactly where the
  // seam has to be invisible.
  BACKGROUND: false,
  // A glyph has an outline and no border. `Applied Treatment` offers `Hard Outline Around Each Glyph`,
  // which is the letterform's own edge drawn into the same component rather than a frame *around* it,
  // so the term suppresses nothing this sheet requires — and it does suppress the plate, card and
  // ruled line this category's own exclusions already ban.
  FONT: false,
};

/**
 * Whether a *limb* is one of this category's components — read by the two negative blocks, which
 * weight `extra limbs, merged limbs` against a duplication failure only a limbed subject can have.
 *
 * The blocks carried the pair on every category, including the ones whose components are floor
 * tiles, panel frames and effect frames. A negative prompt is a fixed weight spent on whatever is in
 * it, so a term naming a failure the sheet cannot have is not free — the same argument the
 * per-category exclusion, guard and audit records were introduced to make, applied to the one
 * channel that had never been given a category.
 *
 * **This deliberately does not read `PERMITTED_KINDS`, and the reason is what the two questions
 * are.** That table answers which *kind of entry a plan may name*, and it gives `anatomy` to
 * CHARACTER and CREATURE alone — a walker's legs are a vehicle's `mechanism` there, correctly,
 * because the inventory it validates is a machine's. This record answers a different question: what
 * a *generator* will duplicate or fuse while drawing. VEHICLE offers `Walker / Mech` as a class and
 * `Articulated Walker Legs` as a drive base, and a sheet of near-side and far-side drive units is
 * exactly the geometry that comes back with a third leg. Deriving this from the kinds table would
 * have been one fact stated once, and wrong for that sheet.
 *
 * The uncertain cases are settled by which error costs more, because the two are not symmetrical: a
 * term the sheet cannot violate spends a little of a finite channel, while a missing one loses a
 * guard against a wrong sheet. So a category takes the pair wherever its own pools can describe a
 * limbed body. OBJECT's cannot — its subjects are terminals, chests, turrets and traps, and the one
 * articulated module it offers is a named deployable drawn in isolation rather than a body plan for
 * the model to complete.
 */
export const LIMBS_ARE_COMPONENTS: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: true,
  CREATURE: true,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: true,
  EFFECT: false,
  INTERFACE: false,
  TERRAIN: false,
  // The one of the three that takes the pair, and it takes it on the record’s own test: this
  // category’s pools describe a body — `Framing & Crop` reaches `Full Body Standing`, and even a
  // bust carries shoulders and the arms below them. A half-body portrait with three hands is a
  // failure a generator actually has here, and it is the one this pair guards against.
  PORTRAIT: true,
  ICON: false,
  BACKGROUND: false,
  // A glyph is a stroke skeleton, and this is the one category whose pools cannot describe a body at
  // all: there is no arm to arrive twice and nothing for a generator to fuse. The pair would be
  // weight spent on a failure this sheet cannot have.
  FONT: false,
};

/**
 * Whether **lettering** is one of this category's components rather than the annotation section 0
 * forbids — the record that makes the app's oldest global rule a per-category one.
 *
 * **What it changes is a contract, not a term.** The template bans text on the sheet in three places:
 * section 0's output contract, section 8's exclusion list and section 9's self-audit. All three were
 * written as global rules, and for twelve categories that is exactly right — a stack count baked into
 * an icon, a caption under a portrait and a legend down the side of a tileset are each a real failure
 * those bans catch. A glyph set is the one deliverable whose *components are lettering*, so on it the
 * three forbid in sections 0, 8 and 9 precisely what section 4 requires, which is the
 * §4-requires/§8-forbids contradiction every per-category record in this file exists to remove.
 *
 * **The exemption is narrow, and the narrowness is the design.** What it lifts is the ban on the
 * inventory's own entries being letters, and it lifts nothing else: a watermark, a signature, a
 * caption naming a component, an index number, a codepoint written beside a glyph, a legend, an arrow
 * and a grid line are all annotation on a font sheet exactly as they are anywhere.
 * `CATEGORY_EXCLUSION_TEXT` and `CATEGORY_AUDIT_TEXT` above are where FONT states that boundary in
 * its own words, and section 0's conditional states it too rather than simply going quiet — a sheet
 * told nothing at all about text comes back with the characters set as a specimen line, which is
 * `CATEGORY_ASSEMBLY.FONT`'s failure.
 *
 * **Four wrappers read it where `FRAME_IS_A_COMPONENT` is read by one**, and the reason is the one
 * that record gives: a negative channel names a thing to avoid and cannot express a placement. So
 * `text`, `labels` and `captions` come out of Midjourney's negative flag, Stable Diffusion's and
 * Qwen's negative blocks and Flux's leading sentence for this category alone, because on it those
 * terms suppress the subject. `watermark` and `signature` stay in every channel that carried them:
 * neither is a character of a font, and no reading of this exemption reaches them.
 *
 * A record rather than a check on the category at the call site, for the reason every per-category
 * fact in this file is one: the next category is a compile error here until somebody answers for it,
 * where a `category === 'FONT'` would silently answer for it wrongly.
 */
export const LETTERING_IS_A_COMPONENT: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: false,
  CREATURE: false,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: false,
  EFFECT: false,
  // The two that ban lettering a second time in their own exclusions, and the ban is *stronger* on
  // them rather than merely inherited: a keybind letter, a stack count and a confirmation word baked
  // into a button cap are each an asset serving one keyboard, one quantity or one language. Nothing
  // about this record loosens either of them.
  INTERFACE: false,
  ICON: false,
  TERRAIN: false,
  PORTRAIT: false,
  BACKGROUND: false,
  FONT: true,
};
