/**
 * A cut-out rig, as the engine that will assemble the pieces declares it.
 *
 * **This app reads this file and never writes one.** It is exported by the engine's own rig tooling
 * — Unsung Saviour's Rig Intake tab writes it from `humanoid_rig.tres`, the one authority for every
 * slot's size, pivot, joint end and pack name — and dropped into the studio here. The format belongs
 * to the writer, and {@link RigContract.format} and {@link RigContract.version} are the two fields a
 * reader can check it by.
 *
 * **The field names are the writer's**, which is why they are not this codebase's spelling. A reader
 * comparing the file against this type should see the same words in both, and the maintainer at the
 * other end sees them again in the rig resource's own inspector. Renaming them here would be a
 * translation table with no owner, and the first thing to go stale when the writer adds a field.
 *
 * **What it fixes.** Without it the prompt can state only the assembled size — *48 × 96 px* — and
 * then has to say outright that no single component is that size, because nothing tells it that the
 * head is 20 × 20 of that frame, the lower arm 7 × 20, or which end of a piece the joint is at. The
 * engine's importer then registers whatever proportions come back flush against the joint edge at
 * one scale for the whole actor, so a limb drawn short against the figure opens a gap at the joint
 * below it and one drawn long overlaps the next.
 *
 * Three fields of the exported document are deliberately absent. `draw_orders` says which pieces sit
 * in front of which per facing, and this app draws pieces rather than layering them. The relative
 * `rest_position` is the offset against the parent bone, where the only one a prompt can say
 * anything with is {@link RigSlot.rest_position_in_frame}. And `facings` lists the directions the
 * rig draws, which is the studio's own `directions` setting: a second answer to how many sheets the
 * deliverable takes is one the two could disagree about, and the reader chooses that one. A
 * document carrying any of the three is read perfectly well; the fields are dropped, never refused.
 */

/** Which end of a piece its joint is at, and therefore which edge its art registers against. */
export type JointEdge = 'top' | 'bottom';

/** A width and a height in the contract's own source pixels. */
export interface RigSize {
  readonly width: number;
  readonly height: number;
}

/** A point in the contract's own source pixels. */
export interface RigPoint {
  readonly x: number;
  readonly y: number;
}

/** One socket in the rig: a piece the sheet has to draw, and everything known about its geometry. */
export interface RigSlot {
  /** The engine's own key for the socket, e.g. `upper_arm_l`. */
  readonly slot_id: string;
  /**
   * What a sprite pack calls this piece, e.g. `left-upper-arm` — the name section 4 lists it under.
   *
   * **This is the name the two projects have to agree on**, and the reason for the whole file: the
   * engine's importer places a piece by looking this up, so a sheet whose inventory calls it
   * anything else is a piece with no socket. Taking it from the contract is what stops the two lists
   * being kept equal by hand across two repositories.
   */
  readonly pack_piece_name: string;
  /** The `slot_id` this piece hangs off, or empty for the rig's root. */
  readonly parent_slot: string;
  /** The size this piece is declared at, inside {@link RigContract.frame_size}. */
  readonly piece_size: RigSize;
  /** Where the joint sits inside the piece, from its own top-left corner. */
  readonly piece_pivot: RigPoint;
  /** Which end of the piece {@link piece_pivot} is at, derived by the writer from the pivot. */
  readonly joint_edge: JointEdge;
  /**
   * Where this piece's joint sits in the assembled frame, with the figure's feet at the origin and
   * Y increasing downward — so a point above the ground is negative.
   *
   * The writer resolves the parent chain for this. It is what turns a list of piece sizes into a
   * figure: it says the shoulder is 78 px up a 96 px frame, which is the proportion a model has to
   * draw to and cannot infer from a size alone.
   */
  readonly rest_position_in_frame: RigPoint;
}

/** The rig: the frame its pieces are measured in, and every piece it declares. */
export interface RigContract {
  /** What the document says it is. One value is accepted; see `parseRigContract`. */
  readonly format: string;
  /** The document format's own version, which is what a reader was built against. */
  readonly version: number;
  /** The rig's name, e.g. `Humanoid`. Shown in the studio so a reader can tell two files apart. */
  readonly skeleton_name: string;
  /** The assembled frame every {@link RigSlot.piece_size} is a share of. */
  readonly frame_size: RigSize;
  /**
   * Every piece, in the contract's declaration order.
   *
   * **That order is load-bearing.** It is the order the engine's atlas lays its columns out in, and
   * section 4 fixes the sheet's reading order from the inventory, so the *n*th piece here is the
   * *n*th component on the sheet and the *n*th entry of the manifest.
   */
  readonly slots: readonly RigSlot[];
}
