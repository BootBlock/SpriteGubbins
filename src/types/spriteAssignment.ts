import type { SpriteBox } from './quantiser.ts';

/**
 * What the reader said about the sheet's sprites, and what the download makes of it.
 *
 * The segmentation says where the artwork is; the inventory says what the prompt asked for. Between
 * them sits the only question neither can answer — **which sprite is which component** — and until
 * this existed the app answered it by counting: names were attached in reading order, and only where
 * the two counts agreed. A sheet that laid the right arm out before the left produced a pack with a
 * wrong name on every piece after the swap, in a file a rig importer believes.
 *
 * So a reader's decision is a first-class thing here, and there are three of them: name this sprite,
 * leave it out, or join it to another. Everything else — the pieces a download writes, the names
 * they take, whether the pack counts as named — is derived from those decisions and the boxes, in
 * `src/utils/spriteAssignment.ts`, once, for the preview and the download together.
 *
 * **A decision is pinned to the artwork, not to a position in a list.** Every dial on the tab can
 * re-segment the sheet: a wider gap joins two boxes, a tighter key splits one. An edit holding an
 * index would then describe a different sprite, silently, which is the failure this whole file
 * exists to remove. It holds a point instead, and a decision whose point no longer lands on any
 * sprite is dropped and counted rather than moved to the nearest one. `SpriteSymmetry`,
 * `SpriteDuplicateGroup` and `AlignedFrame` all carry their own boxes for the same reason.
 *
 * **Pin, not anchor.** `SpriteAnchor` in `spriteCell.ts` is already the corner of a cell an artwork
 * stands at, and the two would be one word for two unrelated things in files a reader moves between.
 */

/**
 * The point on the 1:1 result a decision is pinned to — the centre of the box it was made on.
 *
 * The centre rather than a corner because a corner is exactly what moves when a box grows: joining a
 * speck to its sprite, or letting one more pixel of fringe through, shifts the top-left edge while
 * the artwork stays where it is. A centre survives both, and it is inside the silhouette for every
 * shape this app segments out of a sheet.
 */
export interface SpritePin {
  readonly x: number;
  readonly y: number;
}

/**
 * One of the three things a reader can say about a sprite.
 *
 * `NAME` takes a name out of the studio's inventory and gives it to this sprite's piece. `LEAVE_OUT`
 * keeps the sprite out of the download entirely — the stray fragment a key let through. `JOIN` says
 * this sprite and the one at `to` are one drawing that the segmentation cut in two, so the piece is
 * the two of them together.
 *
 * They are exclusive, and one sprite holds at most one: a joined sprite takes its piece's name from
 * whichever member carries the `NAME`, and a sprite left out is in no piece to name.
 */
export type SpriteDecision =
  | { readonly kind: 'NAME'; readonly name: string }
  | { readonly kind: 'LEAVE_OUT' }
  | { readonly kind: 'JOIN'; readonly to: SpritePin };

/** A decision and the sprite it was made about. */
export interface SpriteEdit {
  readonly pin: SpritePin;
  readonly decision: SpriteDecision;
}

/**
 * How the pieces came by their names, where every inventory name was taken exactly once.
 *
 * `READING_ORDER` is the rule the prompt states and the app has always applied: section 4 fixes the
 * order the components are drawn in, so the *n*th sprite is the *n*th name. `ASSIGNED` means a
 * reader overrode at least one of those, which is a stronger claim about the file and the manifest
 * says which of the two it is rather than leaving a consumer to guess.
 */
export type SpriteNaming = 'READING_ORDER' | 'ASSIGNED';

/** One thing the download writes: a file in a pack, a frame in a document, a rect in a manifest. */
export interface SpritePiece {
  /**
   * The box the piece is cut to — the union of every member's box.
   *
   * A union rather than the members drawn separately, because a piece is one file: two fragments of
   * one arm have to arrive as one image with the space between them intact, or the rig gets an arm
   * in two halves it has no socket for. The same concession the gap dial already makes applies — a
   * third sprite lying inside the union is cut in with them.
   */
  readonly box: SpriteBox;
  /** Which sprites of the segmentation make it up, in reading order. Never empty. */
  readonly members: readonly SpriteBox[];
  /** What the file is called: an inventory name, or `sprite-03` where the sheet is not fully named. */
  readonly name: string;
  /** Whether a reader chose that name, rather than reading order handing it over. */
  readonly assigned: boolean;
}

/** One sprite of the segmentation, and what became of it. */
export interface AssignedSprite {
  readonly box: SpriteBox;
  /** Its own pin — what a new decision about it is pinned to, and what an old one matched. */
  readonly pin: SpritePin;
  /** Its piece, as an index into {@link SpriteAssignment.pieces}, or `null` where it is left out. */
  readonly piece: number | null;
  /** Whether it is the first member of that piece, which is the one that carries the piece's name. */
  readonly leads: boolean;
  /**
   * Where the piece it was joined into starts, in reading order counting from one — `null` where it
   * leads its own piece or is left out.
   *
   * **What a second member is labelled with instead of the piece's name.** Labelling both halves of a
   * join `sprite-02` is indistinguishable on screen from the duplicate-name error this feature exists
   * to reveal: two chips, one name, and nothing saying which of the two readings it is. Found by
   * driving the tab in a browser, where the two states looked identical.
   */
  readonly joinedTo: number | null;
  /** The reader's own decision about it, or `null` where reading order is deciding. */
  readonly decision: SpriteDecision | null;
}

/** The whole reading: what the sheet holds, what the download writes, and how it is named. */
export interface SpriteAssignment {
  /** Every sprite the segmentation found, in reading order, whatever became of it. */
  readonly sprites: readonly AssignedSprite[];
  /** What the download writes, in reading order of each piece's first member. */
  readonly pieces: readonly SpritePiece[];
  /**
   * How the names were decided, or `null` where the pieces are numbered instead.
   *
   * `null` is the state the manifest reports as unnamed: the inventory and the pieces disagree about
   * how many there are, or one name was given to two pieces. Either way no piece can be trusted to
   * be the component its name claims, so none of them carries one.
   */
  readonly naming: SpriteNaming | null;
  /**
   * How many decisions the current segmentation has no sprite for.
   *
   * Reported rather than hidden, because a dial that re-cut the sheet has just thrown away work the
   * reader did, and the panel saying so is the difference between a feature that forgot and one that
   * said what it forgot.
   */
  readonly lost: number;
}
