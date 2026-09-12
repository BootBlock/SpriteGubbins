import type { CategoryAssembly, SubjectCategory } from '../../types/subject.ts';

/**
 * What each category's **assembly failure** is called in the model wrappers' two channels — exploded
 * parts drawn as one finished thing, which is the single claim the prompt makes in five voices and had
 * never been given a category for in any of them.
 *
 * **The defect this record removes:** the two negative blocks opened with `assembled character` and
 * `posed figure`, Flux's leading sentence closed with `no assembled figure`, and the body said it a
 * third, fourth and fifth time — section 4's "Do not draw an assembled figure anywhere on the
 * sheet", section 8's "Assembled or posed complete figures", section 9's "nothing on the sheet is an
 * assembled or part-assembled figure" — on every category.
 * `(assembled character:1.3)` is the highest-weighted term in the whole block, so on a TERRAIN sheet
 * the strongest thing said about the artwork named a subject that sheet could not contain. Read
 * literally the terms were not *wrong* there — every non-figure category's section 8 excludes
 * characters outright — which is why this was left behind when the surface terms and the anatomy
 * pair were given categories. It is a gap rather than a contradiction: the claim was simply not
 * being made. A building sheet's own failure is the finished structure instead of its modules, a
 * terrain sheet's is a view of the ground instead of separable tiles, an effect's is one composited
 * picture instead of a sequence — and none of those had a word spent on them anywhere.
 *
 * **The three body forms began in this record and belong to the sheet now** (issue #278). They reach
 * every target the app composes for rather than the three that declare a wrapper channel, which is why
 * they were given a category at all — the figure vocabulary was being read by a TERRAIN sheet on
 * ChatGPT, Gemini and Midjourney alike while the negative blocks had already stopped saying it. But a
 * form names pieces, and a category's sheets do not share their pieces: filed here, BACKGROUND's layer
 * library was told not to draw “the bands stacked into the finished scene”, and it draws no band. So
 * they are `SheetPlan.assemblyFailure`, written beside the inventory whose pieces they name. The two
 * terms stay here because `categoryAssembly.test.ts` holds each against every sheet the category can
 * compile, so a term that passes names no piece of any of them.
 *
 * **One list serves both negative channels**, as `RENDER_STYLE_SURFACE`'s does and for the same
 * reason: Stable Diffusion weighted two terms while Qwen stated three, one of which — `complete
 * figure` — was `assembled character` said again. A per-category record cannot hold two spellings of
 * one entry without the categories quietly diverging by target, so the redundant synonym goes and
 * each wrapper decides only *how* to say what is here. Weighting stays Stable Diffusion's:
 * `(term:1.3)` is an Automatic1111/compel convention those front-ends parse before the model sees
 * it, and Qwen documents `negative_prompt` as taking a description.
 *
 * **The rule that decides what may go in a list is stated on `CategoryAssembly.negatives`, and it
 * is what makes the entries below asymmetric.** BUILDING and EFFECT each lose the obvious second
 * term to it, and TERRAIN loses the sharper half of its failure entirely: the tiles-already-laid
 * reading cannot be named without "tiles", "ground" or "field", and the last of those is what
 * section 0's own background key is called. What is left is the composed-view reading, in the words
 * TERRAIN's exclusion line already uses for it.
 *
 * CHARACTER and CREATURE keep the pair that shipped. The figure vocabulary was always right for
 * those two, and this record is what stops it being read by the other ten.
 */
export const CATEGORY_ASSEMBLY: Readonly<Record<SubjectCategory, CategoryAssembly>> = {
  CHARACTER: {
    statement: 'no assembled figure',
    negatives: ['assembled character', 'posed figure'],
  },
  // A creature is a figure for a generator's purposes, and both terms hold: the parts joined into
  // one body, and that body doing something. Deliberately not "assembled creature" — the word is a
  // synonym of the subject rather than of the failure, and this is not the entry the issue behind
  // this record was about.
  CREATURE: {
    statement: 'no assembled figure',
    negatives: ['assembled character', 'posed figure'],
  },
  // The second term names the *presentation* half, as `posed figure` does above: the whole prop
  // lit and staged as a finished picture. No component of a part library is a product shot, so it
  // survives the word-by-word rule where "complete object" would not.
  OBJECT: {
    statement: 'no assembled object',
    negatives: ['assembled object', 'product shot'],
  },
  // The presentation half is OBJECT's word rather than one of its own, and the one it nearly took
  // is the reason the rule reaches past the sheet plans. `inventory icon` names exactly what an item
  // sheet comes back as when it fails — one glossy icon instead of a part breakdown — and nothing an
  // item's part library lists is an icon. But `inventory` is what the *template* calls the
  // count-and-order contract: section 4 is titled COMPONENT INVENTORY and refers to "the inventory"
  // throughout, so weighting the word at 1.3 argues with the section that decides how many
  // components the sheet has.
  ITEM: {
    statement: 'no assembled item',
    negatives: ['assembled item', 'product shot'],
  },
  // One term, and the missing second is the rule doing its job rather than an omission. Every
  // candidate for it names what this category's components already are: "complete structure" is
  // barred by the category's own section 4 guards, which call every module-library and directional
  // entry a structural piece, and "finished elevation" or "whole façade" by the directional views,
  // which are wall bays and roof sections drawn at each yaw. None of those is caught by
  // `categoryAssembly.test.ts`, whose half of the rule is the literal one; this is the judgement half.
  // "building" is safe for the reason "character" is: no component of any sheet is one.
  BUILDING: {
    statement: 'no assembled building',
    negatives: ['assembled building'],
  },
  // "complete machine" is the term this entry cannot have — the directional plan's own assembly
  // sentence asks the views to read "as one machine turned", and the hull, drive and mount are
  // machine parts. The staged-render half is safe in the same words OBJECT uses for it.
  VEHICLE: {
    statement: 'no assembled vehicle',
    negatives: ['assembled vehicle', 'product shot'],
  },
  // The category the word-by-word rule bites hardest, and the one whose terms are easiest to get
  // catastrophically wrong. "effect" is out because each component *is* the effect at a moment;
  // "frame" is out for the reason `FRAME_IS_A_COMPONENT` exists, and here every entry in the core
  // group is one; "sequence" and "phase" are out because section 4 carries both by name, in the
  // group heading and its intro. **"layer" is out, and it is the one that got through a first
  // draft**: `stacked layers` reads as this sheet's own failure — the plan says in as many words
  // that no frame "is a layer to be stacked on another" — but the *Secondary Layer* field is what
  // this category calls the smoke, debris and sparks that trail the core, it offers
  // `Layered Multi-Core Cluster` as a focal core, a shipped preset pins that value, and section 4
  // requires "whatever secondary layer the subject named" painted into six of the frames. A term is
  // read word by word, and the singular is the word this sheet is built from.
  //
  // What is left names the collapsed-into-one-picture reading twice without naming what was
  // collapsed: the compositing operation, and the photographic result of superimposing moments.
  // `long exposure` was the other candidate and is a trap of the same kind — an effect's subject can
  // *be* a smear, since the pools offer `Slash / Weapon Trail` and `Projectile Body & Trail`.
  // Note what is deliberately absent: nothing here negates a repeated shape, which would negate the
  // whole sheet, since an effect's frames *are* one phenomenon drawn over and over.
  EFFECT: {
    statement: 'no double exposure or composited picture',
    negatives: ['double exposure', 'composited picture'],
  },
  // "screen" is safe where "interface", "panel" and "frame" are not: the inventories list buttons,
  // panel frames, bars, toggles and the slices of a panel, and no component of either is a screen. The
  // second term is what the sheet is actually returned as when it fails — a picture of a running game
  // rather than a kit of pieces.
  INTERFACE: {
    statement: 'no assembled screen',
    negatives: ['assembled screen', 'game screenshot'],
  },
  // Every word this category's failure wants is a word its components answer to — "landscape",
  // "terrain", "ground", "tile" — and "field" is what section 0 calls the background the sheet is
  // keyed against. So both terms name a *view* rather than the material: nothing on a terrain sheet
  // is a vista or a diorama. `diorama` is the exclusion line's own word and `vista` its own noun;
  // `scenic` is this record's, chosen because the bare noun is thin in a negative channel. The
  // tiles-already-laid half of the failure is not stated here at all, because a term for it would
  // negate the edge agreement section 9 audits — the sheet's own forms state it instead.
  TERRAIN: {
    statement: 'no scenic vista or diorama',
    negatives: ['scenic vista', 'diorama'],
  },
  // "dialogue scene" and "visual novel screenshot" are safe where "portrait", "character" and "face"
  // are not: the inventory is twelve portraits of one person, and no component of it is a scene or a
  // screenshot. The second term is what the sheet is actually returned as when it fails — a picture
  // of the conversation the portraits were drawn for, rather than the set of them.
  PORTRAIT: {
    statement: 'no dialogue scene',
    negatives: ['dialogue scene', 'visual novel screenshot'],
  },
  // **"inventory" is the word this entry could not have**, and it is the trap worth recording: it is
  // the obvious name for what an icon set fails as, it is this category's own first option, *and* it
  // is one of the template's own section headings — so it is a required word for every category in
  // the table, not only this one. `menu screen` is INTERFACE's "assembled screen" narrowed to the
  // same failure without reaching for it, and neither term names an icon, a symbol or a mark.
  ICON: {
    statement: 'no assembled menu screen',
    negatives: ['menu screen', 'game screenshot'],
  },
  // Every word this category's failure wants is a word its components answer to — "scene" is its own
  // `Scene Purpose` field and its own `Full Static Scene Panel` option, and "landscape", "backdrop",
  // "band" and "stacked" are all equally spoken for. So both terms name a *composite* rather than
  // the material: nothing on a background sheet is a picture or a screenshot. `composited picture`
  // is EFFECT's term, shared deliberately — the two categories fail the same way, one in space and
  // one in time — which is the same licence OBJECT and VEHICLE take with `product shot`.
  BACKGROUND: {
    statement: 'no composited picture',
    negatives: ['composited picture', 'game screenshot'],
  },
  // **The one category where the assembly failure and the contract are the same question**, which is
  // what makes the terms hard rather than the concept. This sheet's components are lettering — the
  // one thing section 0 permits here and forbids everywhere else — so the failure is not that text
  // appeared but that the characters were *set*: drawn side by side as a word, a name, a specimen
  // line or a run of body copy, which merges entries the count lists separately.
  //
  // Every obvious word is spoken for, and by this category more thoroughly than by any other.
  // “letter”, “glyph”, “character”, “alphabet”, “type” and “font” are all required — the inventory
  // names ninety-four of them and section 1 carries `Font Family` verbatim — and “text” is the word
  // the whole contract change turns on. “poster” and “signage” are this category's own option values
  // (`Heavy Poster Weight`, `Slab Serif Signage Face`), so a `specimen poster` would negate a weight
  // the subject may have asked for. What is left names the *setting together* without naming what
  // was set: `pangram` is a run of letters and nothing else, and `paragraph` is what a failed sheet
  // actually comes back as. Neither word appears anywhere in a compiled prompt except as a
  // prohibition, which is the condition `CategoryAssembly.negatives` states.
  //
  // **`statement` is the two terms and nothing more, where every other category's reads as a
  // phrase**, and the shortfall is this category's vocabulary rather than an oversight. A draft read
  // `no pangram or paragraph of set text`, and “text” is `Credits & Long Body Text` — an option
  // section 1 may state verbatim — so the qualifier that made the clause read as English negated one
  // of this category's own values. (“set” is safe, and is worth naming because it looks like the
  // second collision: it is a word of the category's own label, `Bitmap Font / Glyph Set`, which
  // `requiredWords` subtracts for every category.) Flux takes the clause positively rather than as a
  // negative prompt, and `categoryAssembly.test.ts` holds it to the terms rule for exactly that
  // reason: the bleed is the same either way.
  FONT: {
    statement: 'no pangram or paragraph',
    negatives: ['pangram', 'paragraph'],
  },
};
