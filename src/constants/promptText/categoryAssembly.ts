import type { CategoryAssembly, SubjectCategory } from '../../types/subject.ts';

/**
 * What each category's **assembly failure** is called — exploded parts drawn as one finished thing,
 * which is the single claim the negative channel exists to make and the one it had never been given
 * a category for.
 *
 * **The defect this record removes:** the two negative blocks opened with `assembled character` and
 * `posed figure`, and Flux's leading sentence closed with `no assembled figure`, on every category.
 * `(assembled character:1.3)` is the highest-weighted term in the whole block, so on a TERRAIN sheet
 * the strongest thing said about the artwork named a subject that sheet could not contain. Read
 * literally the terms were not *wrong* there — every non-figure category's section 8 excludes
 * characters outright — which is why this was left behind when the surface terms and the anatomy
 * pair were given categories. It is a gap rather than a contradiction: the claim was simply not
 * being made. A building sheet's own failure is the finished structure instead of its modules, a
 * terrain sheet's is a view of the ground instead of separable tiles, an effect's is one composited
 * picture instead of a sequence — and none of those had a word spent on them anywhere.
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
  // candidate for it names what this sheet's components already are: "complete structure" is barred
  // by the category's own section 4 guard — "Every entry below is a structural or tile component" —
  // and "finished elevation" or "whole façade" by the directional core, which is wall bays and roof
  // sections drawn at each yaw. None of those is caught by `categoryAssembly.test.ts`, whose half of
  // the rule is the literal one; this is the judgement half. "building" is safe for the reason
  // "character" is: no component of the sheet is one.
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
  // "screen" is safe where "interface", "panel" and "frame" are not: the inventory lists buttons,
  // panel frames, bars and toggles, and no component of it is a screen. The second term is what the
  // sheet is actually returned as when it fails — a picture of a running game rather than a kit of
  // pieces.
  INTERFACE: {
    statement: 'no assembled screen',
    negatives: ['assembled screen', 'game screenshot'],
  },
  // Every word this category's failure wants is a word its components answer to — "landscape",
  // "terrain", "ground", "tile" — and "field" is what section 0 calls the background the sheet is
  // keyed against. So both terms name a *view* rather than the material: nothing on a terrain sheet
  // is a vista or a diorama. `diorama` is the exclusion line's own word and `vista` its own noun;
  // `scenic` is this record's, chosen because the bare noun is thin in a negative channel. The
  // tiles-already-laid half of the failure is not stated at all, because a term for it would negate
  // the edge agreement section 9 audits.
  TERRAIN: {
    statement: 'no scenic vista or diorama',
    negatives: ['scenic vista', 'diorama'],
  },
};
