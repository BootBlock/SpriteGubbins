import type { Direction } from './rendering.ts';
import type { RigMode } from './rigging.ts';
import type { SpriteAnchor } from './spriteCell.ts';
import type { SubjectCategory } from './subject.ts';

/**
 * What a downloaded sheet says about itself, so the artwork can be cut up by something other than a
 * pair of eyes.
 *
 * **This is the half of the pipeline that used to stop at the file.** The tab already knew where
 * every sprite sat — `spriteSegments` returns the boxes, the preview draws a ring around each of
 * them, the duplicate reading says which are the same drawing twice — and none of it left the app:
 * a reader took away one picture and re-found those boundaries by hand in an editor. A manifest is
 * that knowledge written down beside the picture, in the shape an engine importer, a packer or a
 * one-off script can read.
 *
 * **The names come from the prompt that asked for the sheet**, which is the thing no external cutter
 * can know. Section 4 of the prompt fixes both the inventory and the order the components are laid
 * out in, so the *n*th sprite in reading order is the *n*th entry of that inventory — see
 * `componentSlots`, which expands the plan into one name per component.
 *
 * **That mapping is asserted only where it holds.** It rests on the sheet having come back with
 * exactly the components it was asked for, which is precisely what a generator gets wrong, so
 * {@link SpriteManifest.named} states whether the sheet's own count matched the inventory's. Where
 * it did not, every sprite keeps a positional name and the flag says so — a manifest naming the
 * fourteenth sprite `left-hand` on a sheet that came back one component short would be worse than
 * one that named nothing.
 *
 * **This is not the component map the prompt asks a model for**, and the two are named apart so that
 * a reader holding both files can tell which is which. That one is the generator's account of what
 * it meant to draw — written before any pixels exist, and carrying a bone parent nothing here can
 * measure; see `OutputConfig.emitComponentMap`. This one measures the pixels that arrived. Neither
 * can be derived from the other, which is why both exist.
 *
 * **They join on {@link ManifestSprite.index}, and on nothing else.** Both number their entries from
 * one in the reading order section 4 of the prompt fixes, so the *n*th entry of a component map and
 * the *n*th sprite here describe one component. That is what lets a rigging pipeline put the model's
 * `parent` and cell-fraction pivot beside the rect measured here, with no matching step in between —
 * and the map's pivot is the one to take, because the pivot in this file is the convention
 * {@link ManifestSprite.pivotSource} names rather than a measurement. **Not on the name**, which is the pairing that looks equivalent and is
 * not: the map always takes its names from the inventory, while this file only does where
 * {@link SpriteManifest.named} is true, and a sheet that came back a component short is exactly when
 * the two would be matched against each other.
 */

/**
 * Where a sprite's pivot came from, so a consumer can tell a convention from a statement.
 *
 * **`DEFAULT_BOTTOM_CENTRE` is what this app writes when nobody said otherwise**, and it is right
 * for a sprite that stands on the ground and wrong for one that registers at a joint — on an
 * articulated sheet the second is almost every piece: of the fifteen a character's rig sheet draws,
 * only the two feet stand on anything. A pipeline that reads the number without knowing which it
 * holds rigs a forearm about the middle of itself.
 *
 * **`CELL_ANCHOR` is the reader answering that**, and it is a statement rather than a default: the
 * cut-into-a-cell controls ask which edge or corner each piece is registered against, and the pivot
 * is that point. See `SpriteCell`. It is still not a *measurement* — nobody looked at the artwork to
 * find the joint — which is why it joins the default here rather than replacing it.
 *
 * Measuring the joint cap the prompt asks for would add a third member, and the silhouette cannot
 * supply it on its own. A mid-chain segment meets a piece at each end — a lower arm joins the upper
 * arm above it and the hand below it — and section 5 asks for the caps at a shared joint to match,
 * so the two ends of such a piece are alike and geometry cannot say which of them it hangs from.
 * That takes the bone parent the component map states, which the prompt already asks a model for and
 * nothing in this app reads yet.
 */
export type PivotSource = 'DEFAULT_BOTTOM_CENTRE' | 'CELL_ANCHOR';

/** One sprite, where it sits in the written file, and what the inventory calls it. */
export interface ManifestSprite {
  /** Reading order, counting from one — the position section 4 identifies a component by. */
  readonly index: number;
  /**
   * The inventory's name for this component, or a positional name where the sheet was not named.
   *
   * The positional name is `sprite-` and this sprite's {@link ManifestSprite.index}, zero-padded to
   * the width the sheet's own sprite count needs — `sprite-07` on a sheet of fifteen, `sprite-007`
   * on a sheet of two hundred — so that the names sort into the sheet's reading order. It is the
   * ordinal the pack's own file names lead with; see `spriteOrdinal`, which both take it from.
   *
   * Unique within a manifest, so it can be an identifier on the far side: a second component whose
   * inventory entry slugs to the same words takes a numeric suffix.
   */
  readonly name: string;
  /**
   * The artwork's own bounding box in the written file's own pixels — magnified with it, never 1:1.
   *
   * **This is the box whatever the cut is**, and deliberately so. A fixed cell is roomier than the
   * artwork, and a sheet's sprites sit a gutter apart, so a rect widened to the cell would name a
   * region holding the neighbour as well — see `placeInCell`, which measured that. The cell is
   * stated once in {@link SpriteManifest.cell} and the displacement per sprite in
   * {@link cellOffset}, which together say how to build the cell from this box.
   */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * Where this sprite stands, in the same pixels: the foot of its bounding box, horizontally centred.
   *
   * **A default rather than a measurement**, and it is here because every consumer needs one and
   * inventing it per project is how two tools disagree about the same sheet. Bottom-centre is the
   * convention a ground-standing sprite in a three-quarter or top-down game is placed by, so a
   * component that hangs from a socket rather than standing on the ground — an arm, a lid, a
   * detachable roof — will want its own, and this is the number to overrule rather than the answer
   * for it.
   *
   * **Which of those it is, {@link pivotSource} states.** A pair of numbers reads as a measurement
   * whatever the documentation beside it says, and on a cut-out rig sheet it is a measurement of the
   * wrong end for almost every piece — so the file says where the number came from rather than
   * leaving a consumer to find out by rigging a limb and watching the elbow come apart.
   *
   * **Where a cell was asked for, this is the anchor the artwork was registered against** rather
   * than a default at all: the reader named that point because it is where the piece joins whatever
   * carries it, so the pivot is that same point and not a second convention beside it, and
   * {@link pivotSource} says so. The default anchor is bottom-centre, which reproduces the paragraph
   * above exactly. It is a point on the *box* either way, in the sheet's own coordinates —
   * {@link cellOffset} is what moves it into a cell.
   */
  readonly pivot: { readonly x: number; readonly y: number };
  /** Where {@link pivot} came from — see {@link PivotSource}. */
  readonly pivotSource: PivotSource;
  /**
   * Where this sprite's box sits inside its cell, or `null` where each sprite keeps its own box.
   *
   * The one thing a consumer cannot work out from the anchor alone without repeating this app's own
   * rounding: an odd amount of slack is floored, at 1:1, and magnified with everything else. In the
   * written file's own pixels, as the rect above is, and non-`null` exactly when
   * {@link SpriteManifest.cell} is.
   */
  readonly cellOffset: { readonly x: number; readonly y: number } | null;
  /**
   * The index of the sprite this one duplicates, or `null` where it is its own drawing.
   *
   * Straight from the duplicate reading, so it says the same thing the panel says. It is what lets a
   * packer drop a repeat rather than pack the same pixels twice, and it is deliberately an index into
   * this list rather than a name — a name is a convenience for a human, and this is a reference.
   */
  readonly duplicateOf: number | null;
}

/**
 * Which sheet of which deliverable this is, as the studio had it when the file was written.
 *
 * **The bookkeeping a ten-generation character otherwise leaves to the reader.** An eight-compass
 * character is two core sheets and eight articulation runs, each generated separately and each
 * arriving as its own download named after whatever file the browser saved — and nothing in any of
 * them says which sheet of which subject it is. These fields are what makes ten packs sort
 * themselves.
 *
 * **A statement about the studio, not a claim about the image.** Nothing in the app can check that
 * the dropped sheet is the one the studio is composing, so this records the configuration that was
 * on screen at the moment the file was written, and says so in the guidance behind the control.
 */
export interface ManifestSheet {
  readonly category: SubjectCategory;
  /** The plan's own name — `Directional core — cardinal facings`, `Articulation`, `Rig pieces`. */
  readonly plan: string;
  /** Which sheet of the batch, counting from one, and how many there are. */
  readonly ordinal: number;
  readonly total: number;
  /** Every facing this sheet draws, in the order the inventory lists them. */
  readonly facings: readonly Direction[];
  /** The facing this sheet assembles towards, which fixes its depth order. */
  readonly assembly: Direction;
  /** How many components the prompt for this sheet contracted for. */
  readonly components: number;
  /**
   * Whether the prompt asked for a rig, and which one — the studio's own answer, after resolution.
   *
   * **What decides whether a bottom-centre pivot is a starting point or a defect.** On a `NONE`
   * sheet the components are placed, so the foot of the box is where most of them belong. Both of
   * the others register their pieces at joints instead — a `CUTOUT_RIG` sheet carries section 5's
   * cap at each piece's joint end, with its centre named as the pivot, and a `POSE_LIBRARY` sheet is
   * assembled by hand about the same shared pivots — and this file states the foot of the box
   * regardless. A consumer reading either of those should treat every {@link ManifestSprite.pivot}
   * as a number to replace.
   */
  readonly rigMode: RigMode;
}

/** The sheet, what came back on it, and where each piece of it is. */
export interface SpriteManifest {
  /**
   * The manifest format's own version, so a consumer can tell one shape from another.
   *
   * Not a compatibility surface: this app is pre-1.0 and replaces what it supersedes, so a change
   * here is a change to the only shape that exists. It is written down because the file leaves the
   * app and is read by something this repository does not contain.
   */
  readonly version: number;
  /**
   * The file the sprites are cut from, as the pack writes it beside this manifest.
   *
   * **Read it rather than assuming a name**, for the reason {@link SpriteManifest.spriteDirectory}
   * gives: it was always `sheet.png`, and it now carries whatever word tells this sheet apart from
   * the rest of its batch — the facing where one names the sheet, its position in the batch where
   * none does — so that a batch extracted into one directory leaves one sheet picture per
   * generation rather than one in total. In a manifest written alone it is the PNG the same press
   * would have produced, which the reader downloads separately.
   */
  readonly image: string;
  /**
   * The directory inside the pack the cut-out sprites sit in, or `null` in a manifest written alone.
   *
   * **Stated because it stopped being a constant.** It was always `sprites`, so a consumer could
   * hard-code the path; it now carries the same word {@link SpriteManifest.image} does — the
   * sheet's own facing where one names it, its position in the batch where none does — which is
   * what makes eight rig runs unzip into a tree keyed by facing. Which of the two a sheet takes is
   * a reading of the whole batch and is deliberately not derivable from
   * {@link ManifestSheet.facings}, so a manifest that named neither would leave the one
   * machine-readable index in the archive unable to find the files beside it.
   *
   * `null` where this manifest was downloaded on its own: it describes a PNG the reader takes
   * separately, and there are no sprite files for a directory to hold.
   */
  readonly spriteDirectory: string | null;
  readonly width: number;
  readonly height: number;
  /** How far the written file magnifies the quantised sheet — `1` for the sheet at its own size. */
  readonly scale: number;
  /** The studio's configuration at the moment of writing, or `null` where the tab was asked alone. */
  readonly sheet: ManifestSheet | null;
  /** Whether {@link ManifestSprite.name} carries inventory names or positional ones. */
  readonly named: boolean;
  /**
   * The fixed cell every sprite was cut into, or `null` where each kept its own bounding box.
   *
   * **The field a rig importer reads before it reads anything else.** An importer of cut-out pieces
   * declares a slot size and refuses artwork that does not match it, so a pack of fifteen differently
   * sized pieces is one it cannot take at all — see `SpriteCell`, which says why the app offers a
   * cell rather than trimming or leaving the boxes as they fell.
   *
   * Stated in the written file's own pixels, as the rects above are, so the two need no factor
   * between them. The anchor says where in each cell the artwork stands, and is the point
   * {@link ManifestSprite.pivot} carries wherever this is not `null`.
   *
   * **A cell is a canvas, not a region of the sheet.** Each sprite's file in a pack is this size,
   * holding that sprite's bounding box at {@link ManifestSprite.cellOffset} and transparency
   * everywhere else. Cutting the sheet at a cell-sized rect instead would take in whatever sits a
   * gutter away, which `placeInCell` measured on all eight reference sheets.
   */
  readonly cell: ManifestCell | null;
  readonly sprites: readonly ManifestSprite[];
}

/** The cell a cut used, at the written file's own magnification. */
export interface ManifestCell {
  readonly width: number;
  readonly height: number;
  readonly anchor: SpriteAnchor;
}
