import type { CategoryAssembly, SubjectCategory } from '../../types/subject.ts';

/**
 * What each category's **assembly failure** is called — exploded parts drawn as one finished thing,
 * which is the single claim the prompt makes in five voices and had never been given a category for
 * in any of them.
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
 * **The three body forms arrived after the two wrapper ones and are the larger half.** A wrapper
 * reaches the three targets that declare a channel for it; the body reaches every target the app
 * composes for, so the figure vocabulary was being read by a TERRAIN sheet on ChatGPT, Gemini and
 * Midjourney alike while the negative blocks had already stopped saying it. Each form is written for
 * the section it lands in rather than spliced from one string — an instruction, an exclusion and a
 * check are three different jobs, and `CategoryAssembly` says on each field what its own job costs
 * when it is got wrong.
 *
 * **Two of them displaced wording TERRAIN already carried.** That category was the only one whose
 * assembly failure had reached the body at all, ad hoc: `CATEGORY_EXCLUSION_TEXT` banned "any
 * composed landscape, vista or diorama drawn in place of the component grid" and `CATEGORY_AUDIT_TEXT`
 * asked for "nothing drawn as a landscape view rather than as a separate piece". Both clauses moved
 * here, and their old homes gave them up in the same change — one list saying one thing twice in two
 * wordings is what a per-category record is for removing, not for creating.
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
 * those two, and this record is what stops it being read by the other seven.
 */
export const CATEGORY_ASSEMBLY: Readonly<Record<SubjectCategory, CategoryAssembly>> = {
  // The three body forms are the wording that shipped, unchanged: this is the one category the
  // figure vocabulary was written for, and giving the other eight their own is what this record does
  // rather than a rewrite of the two it always fitted.
  CHARACTER: {
    statement: 'no assembled figure',
    negatives: ['assembled character', 'posed figure'],
    instruction: 'Do not draw an assembled figure anywhere on the sheet, including as a reference or key.',
    exclusion: 'Assembled or posed complete figures.',
    audit: 'nothing on the sheet is an assembled or part-assembled figure',
  },
  // A creature is a figure for a generator's purposes, and both terms hold: the parts joined into
  // one body, and that body doing something. Deliberately not "assembled creature" — the word is a
  // synonym of the subject rather than of the failure, and this is not the entry the issue behind
  // this record was about.
  CREATURE: {
    statement: 'no assembled figure',
    negatives: ['assembled character', 'posed figure'],
    instruction: 'Do not draw an assembled figure anywhere on the sheet, including as a reference or key.',
    exclusion: 'Assembled or posed complete figures.',
    audit: 'nothing on the sheet is an assembled or part-assembled figure',
  },
  // The second term names the *presentation* half, as `posed figure` does above: the whole prop
  // lit and staged as a finished picture. No component of a part library is a product shot, so it
  // survives the word-by-word rule where "complete object" would not.
  //
  // The body forms open the shape the four one-subject categories share — "the parts fitted together
  // into the assembled X", INTERFACE saying "pieces" for what its own inventory calls them — which
  // names what the sheet must not *depict* without touching what section 6 asks the set to be
  // *capable* of. "The complete object in its resting state" is that plan's own phrase for the
  // capability, so this one does not borrow it.
  //
  // **The last two forms say "the object itself" rather than "the object, in whole or in part", and
  // the word is load-bearing.** This sheet's inventory lists a `Primary moving subassembly`, which is
  // literally parts assembled — so a check reading "nothing is the object assembled, in part" invites
  // a reader to fail the sheet on an entry section 4 required, which is the `CATEGORY_AUDIT_TEXT`
  // "no exhaust" mistake wearing this record's clothes. "Itself" anchors both forms to the whole
  // subject, which no component is.
  OBJECT: {
    statement: 'no assembled object',
    negatives: ['assembled object', 'product shot'],
    instruction:
      'Do not draw the parts fitted together into the assembled object anywhere on the sheet, including as a reference or key.',
    exclusion: 'The object itself, whole or partly built, and any staged product shot of it.',
    audit: 'nothing on the sheet is the object itself, whole or partly built',
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
    instruction:
      'Do not draw the parts fitted together into the assembled item anywhere on the sheet, including as a reference or key.',
    exclusion: 'The item itself, whole or partly built, and any staged product shot of it.',
    audit: 'nothing on the sheet is the item itself, whole or partly built',
  },
  // One term, and the missing second is the rule doing its job rather than an omission. Every
  // candidate for it names what this sheet's components already are: "complete structure" is barred
  // by the category's own section 4 guard — "Every entry below is a structural or tile component" —
  // and "finished elevation" or "whole façade" by the directional core, which is wall bays and roof
  // sections drawn at each yaw. None of those is caught by `categoryAssembly.test.ts`, whose half of
  // the rule is the literal one; this is the judgement half. "building" is safe for the reason
  // "character" is: no component of the sheet is one.
  //
  // **This is the second category with two deliverables, and the body forms have to name both — a
  // first draft named only the one the negative term is written for.** `TILESET_MODULAR` is this
  // category's *default and fallback* mode and its plan is sixteen entries of `kind: 'tile'`, so a
  // form saying "the modules fitted together" describes a component class that sheet's section 4
  // never introduces, and leaves the failure it actually comes back as — a room or a wall drawn
  // instead of a grid of separable tiles — named nowhere in the prompt. That is the same half TERRAIN
  // recovers below, and this is the only other category that has it. So the forms name the standing
  // structure and the laid stretch both, and neither noun is bare: a floor tile is not "a stretch of
  // floor drawn with its tiles already laid", which is what keeps the audit off the sixteen entries
  // section 4 requires.
  //
  // "standing complete" rather than "the complete structure", and "a stretch of floor or wall" rather
  // than "a straight wall run": both of those are the plans' own words for the capability section 6
  // asks the set to have, and a form that borrows them reads as forbidding the capability rather than
  // the depiction.
  BUILDING: {
    statement: 'no assembled building',
    negatives: ['assembled building'],
    instruction:
      'Do not draw the building standing complete, or a laid stretch of its floor or wall tiles, anywhere on the sheet, including as a reference or key.',
    exclusion:
      'The building standing complete, and any stretch of floor or wall drawn with its tiles already laid rather than as separate pieces.',
    audit:
      'nothing on the sheet is the building standing complete, or a stretch of floor or wall drawn with its tiles already laid',
  },
  // "complete machine" is the term this entry cannot have — the directional plan's own assembly
  // sentence asks the views to read "as one machine turned", and the hull, drive and mount are
  // machine parts. The staged-render half is safe in the same words OBJECT uses for it.
  VEHICLE: {
    statement: 'no assembled vehicle',
    negatives: ['assembled vehicle', 'product shot'],
    instruction:
      'Do not draw the parts fitted together into the assembled vehicle anywhere on the sheet, including as a reference or key.',
    exclusion: 'The vehicle itself, whole or partly built, and any staged product shot of it.',
    audit: 'nothing on the sheet is the vehicle itself, whole or partly built',
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
  //
  // The one category whose assembly failure is not a fitting-together at all: its components are
  // moments rather than parts, so what it comes back as is the moments drawn on top of one another.
  // The body forms may use "frames", which `negatives` may not — a weighted `frame` would suppress
  // every entry on the sheet, while "the frames overlaid into one composited picture" is a whole
  // clause with a stated relation between them, which is the thing being banned. Section 9's counts
  // the frames rather than naming the whole, because "two or more overlaid" is what a reader can
  // actually check on the delivered image.
  EFFECT: {
    statement: 'no double exposure or composited picture',
    negatives: ['double exposure', 'composited picture'],
    instruction:
      'Do not draw the frames overlaid into one composited picture anywhere on the sheet, including as a reference or key.',
    exclusion: 'The frames overlaid, blended or composited into one picture of the effect.',
    audit: 'nothing on the sheet is two or more frames overlaid into one picture',
  },
  // "screen" is safe where "interface", "panel" and "frame" are not: the inventory lists buttons,
  // panel frames, bars and toggles, and no component of it is a screen. The second term is what the
  // sheet is actually returned as when it fails — a picture of a running game rather than a kit of
  // pieces.
  INTERFACE: {
    statement: 'no assembled screen',
    negatives: ['assembled screen', 'game screenshot'],
    instruction:
      'Do not draw the pieces fitted together into the assembled screen anywhere on the sheet, including as a reference or key.',
    exclusion: 'The screen itself, whole or partly arranged, and any picture of the interface in use.',
    audit: 'nothing on the sheet is the screen itself, whole or partly arranged',
  },
  // Every word this category's failure wants is a word its components answer to — "landscape",
  // "terrain", "ground", "tile" — and "field" is what section 0 calls the background the sheet is
  // keyed against. So both terms name a *view* rather than the material: nothing on a terrain sheet
  // is a vista or a diorama. `diorama` is the exclusion line's own word and `vista` its own noun;
  // `scenic` is this record's, chosen because the bare noun is thin in a negative channel. The
  // tiles-already-laid half of the failure is not stated at all, because a term for it would negate
  // the edge agreement section 9 audits.
  //
  // **The body forms recover the half `negatives` had to give up.** The tiles-already-laid reading
  // cannot be weighted as a term without negating the subject, so the negative channel says only the
  // composed-view half — but a whole clause can hold both, because "laid together" is a relation
  // between tiles rather than a word standing in for one. Section 9's says "drawn already laid
  // together" for the reason that record's own TERRAIN line is qualified twice over: the audit is
  // applied tile by tile, and a check reading "no laid tiles" would fail the sheet on the fourteen
  // section 4 requires. The composed-view wording is `CATEGORY_EXCLUSION_TEXT`'s and
  // `CATEGORY_AUDIT_TEXT`'s own, moved here from both and deleted from both.
  TERRAIN: {
    statement: 'no scenic vista or diorama',
    negatives: ['scenic vista', 'diorama'],
    instruction:
      'Do not draw the tiles laid together, or a landscape composed from them, anywhere on the sheet, including as a reference or key.',
    exclusion:
      'The tiles laid together, and any landscape, vista or diorama composed from them in place of the component grid.',
    audit:
      'nothing on the sheet is a run of tiles drawn already laid together, or a landscape composed from them',
  },
};
