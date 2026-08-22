import type { Direction } from './rendering.ts';
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
 */

/** One sprite, where it sits in the written file, and what the inventory calls it. */
export interface ManifestSprite {
  /** Reading order, counting from one — the position section 4 identifies a component by. */
  readonly index: number;
  /**
   * The inventory's name for this component, or `sprite-07` where the sheet was not named.
   *
   * Unique within a manifest, so it can be an identifier on the far side: a second component whose
   * inventory entry slugs to the same words takes a numeric suffix.
   */
  readonly name: string;
  /** The bounding box in the written file's own pixels — magnified with it, never at 1:1. */
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
   */
  readonly pivot: { readonly x: number; readonly y: number };
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
  /** The file the sprites are cut from, as the pack writes it beside this manifest. */
  readonly image: string;
  readonly width: number;
  readonly height: number;
  /** How far the written file magnifies the quantised sheet — `1` for the sheet at its own size. */
  readonly scale: number;
  /** The studio's configuration at the moment of writing, or `null` where the tab was asked alone. */
  readonly sheet: ManifestSheet | null;
  /** Whether {@link ManifestSprite.name} carries inventory names or positional ones. */
  readonly named: boolean;
  readonly sprites: readonly ManifestSprite[];
}
