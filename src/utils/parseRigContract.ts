import type { JointEdge, RigContract, RigPoint, RigSize, RigSlot } from '../types/rigContract.ts';

/**
 * Reading a rig contract, and saying why when it will not be read.
 *
 * **One authority, because there are two readers.** The studio reads a file the reader drops in, and
 * `parseImageConfig` reads the same document back out of a stored row. A second, laxer path on the
 * storage side would let a contract this one refused arrive from the database instead, which is the
 * quiet version of not checking at all.
 *
 * **A document is taken whole or not at all.** Every refusal below is a state in which some piece of
 * the rig cannot be stated — a slot with no name is a component the sheet cannot list, a frame of
 * nothing makes every piece size a share of nothing — and a contract read *partly* would put the
 * missing pieces' absence in the one place nobody looks: an inventory that is simply shorter than
 * the rig. The prompt would then contract for twelve pieces of a fifteen-piece actor and say nothing
 * about it.
 *
 * **A version it does not know is refused rather than read hopefully.** The writer states the
 * version because the file leaves its repository, and the whole value of that is a reader that stops
 * when the shape it was built against is not the shape it was handed.
 */

/** What a rig contract says it is. Anything else is a JSON file that is not one of these. */
export const RIG_CONTRACT_FORMAT = 'unsung-saviour-rig-contract';

/** The one document version this app was built against. */
export const RIG_CONTRACT_VERSION = 1;

/** The contract, or `null` and the sentences that stopped it. Never both. */
export interface RigContractReading {
  readonly contract: RigContract | null;
  readonly problems: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function size(value: unknown): RigSize | null {
  if (!isRecord(value)) return null;
  const { width, height } = value;
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function point(value: unknown): RigPoint | null {
  if (!isRecord(value)) return null;
  const { x, y } = value;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slot(value: unknown, at: number, problems: string[]): RigSlot | null {
  const where = `Slot ${String(at + 1)}`;
  if (!isRecord(value)) {
    problems.push(`${where} is not an object.`);
    return null;
  }

  const slotId = text(value['slot_id']);
  const name = text(value['pack_piece_name']);
  const pieceSize = size(value['piece_size']);
  const pivot = point(value['piece_pivot']);
  const rest = point(value['rest_position_in_frame']);
  const edge = text(value['joint_edge']);
  const jointEdge: JointEdge | null = edge === 'top' ? 'top' : edge === 'bottom' ? 'bottom' : null;

  if (slotId === '') problems.push(`${where} declares no slot_id.`);
  // The one field with a consequence outside this file: it is the name section 4 lists the piece
  // under and the name the engine's importer looks the returned art up by, so a slot without one is
  // a piece that cannot be asked for or placed.
  if (name === '') problems.push(`${where} declares no pack_piece_name, so nothing could name it.`);
  if (pieceSize === null) problems.push(`${where} declares a piece_size that encloses nothing.`);
  if (pivot === null) problems.push(`${where} declares no piece_pivot.`);
  if (rest === null) problems.push(`${where} declares no rest_position_in_frame.`);
  if (jointEdge === null) {
    problems.push(`${where} says its joint is at the ‘${edge}’ edge, which is not top or bottom.`);
  }

  if (pieceSize === null || pivot === null || rest === null || jointEdge === null) return null;
  if (slotId === '' || name === '') return null;

  return {
    slot_id: slotId,
    pack_piece_name: name,
    parent_slot: text(value['parent_slot']),
    piece_size: pieceSize,
    piece_pivot: pivot,
    joint_edge: jointEdge,
    rest_position_in_frame: rest,
  };
}

function facingsOf(value: unknown, problems: string[]): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push('The contract names no facings, so nothing says how many sheets the rig takes.');
    return [];
  }
  const named = value.map((facing: unknown) => text(facing)).filter((facing) => facing !== '');
  if (named.length !== value.length) problems.push('One of the facings has no name.');
  return named;
}

function refused(problems: readonly string[]): RigContractReading {
  return { contract: null, problems };
}

export function parseRigContract(value: unknown): RigContractReading {
  if (!isRecord(value)) return refused(['This file does not hold a JSON object.']);

  const format = text(value['format']);
  if (format !== RIG_CONTRACT_FORMAT) {
    return refused([
      format === ''
        ? 'This file does not say what format it is, so it is not a rig contract.'
        : `This file is a ‘${format}’, not a ${RIG_CONTRACT_FORMAT}.`,
    ]);
  }

  const version = value['version'];
  if (version !== RIG_CONTRACT_VERSION) {
    return refused([
      `This contract is version ${String(version)}, and this app reads version ` +
        `${String(RIG_CONTRACT_VERSION)}. Nothing here can tell what changed between them.`,
    ]);
  }

  const problems: string[] = [];
  const frame = size(value['frame_size']);
  if (frame === null) {
    problems.push('The contract states no assembled frame, so no piece size is a share of anything.');
  }

  const facings = facingsOf(value['facings'], problems);
  const declared: unknown = value['slots'];
  const slots: RigSlot[] = [];
  if (!Array.isArray(declared) || declared.length === 0) {
    problems.push('The contract declares no slots, so there is no piece to draw.');
  } else {
    const taken = new Set<string>();
    declared.forEach((entry: unknown, at: number) => {
      const read = slot(entry, at, problems);
      if (read === null) return;
      // Two slots answering to one pack name is the mis-mapping the name exists to prevent: the
      // sheet would draw the piece twice under one name and the importer would place one of them
      // into the other's socket, reporting nothing.
      if (taken.has(read.pack_piece_name)) {
        problems.push(`Two slots are both called ‘${read.pack_piece_name}’.`);
        return;
      }
      taken.add(read.pack_piece_name);
      slots.push(read);
    });
  }

  if (frame === null || problems.length > 0) return refused(problems);

  return {
    contract: {
      format,
      version: RIG_CONTRACT_VERSION,
      skeleton_name: text(value['skeleton_name']),
      frame_size: frame,
      facings,
      slots,
    },
    problems: [],
  };
}
