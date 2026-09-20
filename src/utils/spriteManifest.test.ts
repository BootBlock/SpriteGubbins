import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import type { RigContract } from '../types/rigContract.ts';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import { buildManifest, encodeManifest, MANIFEST_VERSION } from './spriteManifest.ts';

const box = (left: number, top: number, width = 4, height = 4): SpriteBox => ({
  left,
  top,
  width,
  height,
  pixels: width * height,
});

/** Three sprites in reading order, as `spriteSegments` returns them. */
const BOXES = [box(0, 0), box(10, 0), box(0, 10)];

const input = {
  image: 'armour-quantised.png',
  spriteDirectory: null,
  width: 40,
  height: 40,
  scale: 1,
  boxes: BOXES,
  duplicates: [],
  // One name per box, as `namePieces` hands them over. The plain case is the positional one, which
  // is what a sheet whose pieces could not be matched to the inventory comes to.
  names: ['sprite-1', 'sprite-2', 'sprite-3'],
  naming: null,
  cell: null,
  sheet: null,
};

/** One slot of the engine's humanoid rig, which is enough to tell one revision of it from another. */
const CONTRACT: RigContract = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'upper_arm_l',
      pack_piece_name: 'left-upper-arm',
      parent_slot: 'torso',
      piece_size: { width: 8, height: 22 },
      piece_pivot: { x: 4, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -78 },
    },
  ],
};

/** The cut-out rig sheet, which is the one sheet of a character batch a contract reaches. */
const RIG_SHEET: ManifestSheet = {
  category: 'CHARACTER',
  plan: 'Rig pieces',
  ordinal: 3,
  total: 10,
  facings: ['south'],
  assembly: 'south',
  components: 15,
  rigMode: 'CUTOUT_RIG',
  rigContract: null,
};

describe('buildManifest', () => {
  it('states the rects in reading order, counting from one', () => {
    const manifest = buildManifest(input);

    expect(manifest.version).toBe(MANIFEST_VERSION);
    expect(manifest.sprites.map((sprite) => [sprite.index, sprite.x, sprite.y])).toStrictEqual([
      [1, 0, 0],
      [2, 10, 0],
      [3, 0, 10],
    ]);
  });

  it('scales the rects to the file the download actually writes', () => {
    // Segmentation runs on the 1:1 result and the file may be magnified, so a manifest stating the
    // 1:1 boxes would describe a sheet nobody has.
    const manifest = buildManifest({ ...input, scale: 4, width: 160, height: 160 });

    expect(manifest.sprites[1]).toMatchObject({ x: 40, y: 0, width: 16, height: 16 });
    expect(manifest.scale).toBe(4);
  });

  it('stands each sprite at the foot of its box, centred', () => {
    const manifest = buildManifest(input);

    expect(manifest.sprites[0]?.pivot).toStrictEqual({ x: 2, y: 4 });
  });

  it('says the pivot is the default rather than a measurement', () => {
    // The trap this closes: a pair of numbers reads as a measurement, and on a cut-out rig sheet it
    // is the wrong end of almost every piece. Every sprite states where its number came from.
    const manifest = buildManifest(input);

    expect(manifest.sprites.map((sprite) => sprite.pivotSource)).toStrictEqual([
      'DEFAULT_BOTTOM_CENTRE',
      'DEFAULT_BOTTOM_CENTRE',
      'DEFAULT_BOTTOM_CENTRE',
    ]);
  });

  it('writes the names it was handed, in the order it was handed them', () => {
    // It no longer decides. Which sprite is which component is settled by `resolveAssignment` before
    // the press, because deciding it here meant comparing two list lengths — and a length cannot see
    // an order, which is why a sheet that drew the right arm first named both arms wrongly.
    const manifest = buildManifest({
      ...input,
      names: ['heads-south', 'heads-west', 'heads-north'],
      naming: 'READING_ORDER',
    });

    expect(manifest.named).toBe(true);
    expect(manifest.naming).toBe('READING_ORDER');
    expect(manifest.sprites.map((sprite) => sprite.name)).toStrictEqual([
      'heads-south',
      'heads-west',
      'heads-north',
    ]);
  });

  it('records that a reader assigned the names rather than the app inferring them', () => {
    // The two are different warrants over the same claim, and a consumer that wants to treat a
    // checked name differently from a counted one can only do so if the file says which it holds.
    const manifest = buildManifest({
      ...input,
      names: ['arm-left', 'arm-right', 'torso'],
      naming: 'ASSIGNED',
    });

    expect(manifest.named).toBe(true);
    expect(manifest.naming).toBe('ASSIGNED');
  });

  it('reports a positional sheet as unnamed, through both fields at once', () => {
    // `named` is derived from `naming` rather than carried beside it, so the two cannot drift apart
    // in a written file — the older boolean is what an importer gates on and stays true to the new one.
    const manifest = buildManifest(input);

    expect(manifest.naming).toBeNull();
    expect(manifest.named).toBe(false);
    expect(manifest.sprites.map((sprite) => sprite.name)).toStrictEqual(['sprite-1', 'sprite-2', 'sprite-3']);
  });

  it('links a duplicate to the sprite it repeats, by index', () => {
    const manifest = buildManifest({
      ...input,
      duplicates: [
        { canonical: BOXES[0] as SpriteBox, duplicates: [{ box: BOXES[2] as SpriteBox, exact: true }] },
      ],
    });

    expect(manifest.sprites.map((sprite) => sprite.duplicateOf)).toStrictEqual([null, null, 1]);
  });

  it('drops a link whose box the segmentation no longer holds', () => {
    // A duplicate group describes the sheet *before* a snap, and a snap rewrites pixels — which can
    // split or join a region. Guessing at the nearest box would point a packer at the wrong artwork.
    const manifest = buildManifest({
      ...input,
      duplicates: [{ canonical: box(99, 99), duplicates: [{ box: BOXES[1] as SpriteBox, exact: false }] }],
    });

    expect(manifest.sprites.every((sprite) => sprite.duplicateOf === null)).toBe(true);
  });

  it('carries the studio’s own account of which sheet this is', () => {
    const manifest = buildManifest({
      ...input,
      sheet: {
        category: 'CHARACTER',
        plan: 'Directional core — cardinal facings',
        ordinal: 1,
        total: 10,
        facings: ['south', 'west', 'north', 'east'],
        assembly: 'south',
        components: 12,
        rigMode: 'CUTOUT_RIG',
        rigContract: null,
      },
    });

    expect(manifest.sheet).toMatchObject({ ordinal: 1, total: 10, components: 12 });
  });

  it('writes the rig contract into the file under the engine’s own field names', () => {
    // The names are a quotation rather than this app's spelling, so a consumer holding the manifest
    // and the contract beside it compares `piece_size` with `piece_size`. `JSON.stringify` is what
    // a renamed field would slip past silently, so the assertion is made against the written bytes.
    const manifest = buildManifest({ ...input, sheet: { ...RIG_SHEET, rigContract: CONTRACT } });
    const written: unknown = JSON.parse(new TextDecoder().decode(encodeManifest(manifest)));

    expect(written).toMatchObject({
      sheet: {
        rigMode: 'CUTOUT_RIG',
        rigContract: {
          format: 'unsung-saviour-rig-contract',
          version: 1,
          skeleton_name: 'Humanoid',
          frame_size: { width: 48, height: 96 },
          slots: [
            {
              slot_id: 'upper_arm_l',
              pack_piece_name: 'left-upper-arm',
              piece_size: { width: 8, height: 22 },
              piece_pivot: { x: 4, y: 3 },
              joint_edge: 'top',
              rest_position_in_frame: { x: -11, y: -78 },
            },
          ],
        },
      },
    });
  });

  it('leaves the contract in its own source pixels, whatever the file is magnified by', () => {
    // The one set of numbers in the file that does not move with the scale, and deliberately so:
    // the field is the engine's own document quoted back, so a contract multiplied by a download's
    // magnification would stop identifying the rig revision it exists to identify.
    const sheet = { ...RIG_SHEET, rigContract: CONTRACT };
    const at1 = buildManifest({ ...input, scale: 1, sheet });
    const at4 = buildManifest({ ...input, scale: 4, sheet });

    expect(at4.scale).toBe(4);
    expect(at4.sheet?.rigContract).toStrictEqual(CONTRACT);
    expect(at4.sheet?.rigContract).toStrictEqual(at1.sheet?.rigContract);
  });

  it('states outright that a rig sheet was drawn against no contract', () => {
    // The pack the whole field exists for. It is `named`, every piece finds its socket, and the
    // proportions are the model's — so `null` beside a `CUTOUT_RIG` is what an importer refuses on.
    const manifest = buildManifest({ ...input, sheet: RIG_SHEET });
    const written = new TextDecoder().decode(encodeManifest(manifest));

    expect(manifest.sheet?.rigContract).toBeNull();
    expect(written).toContain('"rigContract": null');
  });
});

describe('buildManifest, cut into a cell', () => {
  const cell = { width: 8, height: 8, anchor: { x: 'CENTRE', y: 'BOTTOM' } } as const;

  it('keeps the rect on the artwork’s own bounding box, whatever the cut is', () => {
    // A cell-sized rect would name a region holding whatever sits a gutter away — see `placeInCell`,
    // which measured that on all eight reference sheets.
    const manifest = buildManifest({ ...input, boxes: [box(10, 10, 4, 6)], cell });

    expect(manifest.sprites[0]).toMatchObject({ x: 10, y: 10, width: 4, height: 6 });
  });

  it('states where that box sits inside its cell', () => {
    const manifest = buildManifest({ ...input, boxes: [box(10, 10, 4, 6)], cell });

    // Two pixels of slack either side across, and the artwork against the foot.
    expect(manifest.sprites[0]?.cellOffset).toStrictEqual({ x: 2, y: 2 });
  });

  it('records the cell itself, at the magnification the file is written in', () => {
    // The field a rig importer reads before it reads anything else: the rects say where each piece
    // is and this says what shape every one of them is.
    expect(buildManifest({ ...input, scale: 2, cell }).cell).toStrictEqual({
      width: 16,
      height: 16,
      anchor: { x: 'CENTRE', y: 'BOTTOM' },
    });
  });

  it('carries no cell and no offset where each sprite kept its bounding box', () => {
    const manifest = buildManifest(input);

    expect(manifest.cell).toBeNull();
    expect(manifest.sprites.map((sprite) => sprite.cellOffset)).toStrictEqual([null, null, null]);
  });

  it('puts the pivot on the anchor the artwork was registered against', () => {
    const manifest = buildManifest({
      ...input,
      boxes: [box(10, 10, 4, 6)],
      cell: { ...cell, anchor: { x: 'LEFT', y: 'TOP' } },
    });

    // The reader named that point because it is where the piece joins whatever carries it, so the
    // pivot is that same point rather than a second convention beside it — and it is a point on the
    // box, which is what `cellOffset` moves into the cell.
    expect(manifest.sprites[0]?.pivot).toStrictEqual({ x: 10, y: 10 });
  });

  it('measures the offset at 1:1 and magnifies it, so one placement serves every rung', () => {
    const magnified = buildManifest({ ...input, scale: 4, boxes: [box(10, 10, 5, 6)], cell });

    // Centred at 1:1 the 5-wide artwork leaves an odd pixel, floored to an offset of 1; at 4× that
    // is 4. Flooring after scaling would have centred 20 in 32 and landed on 6.
    expect(magnified.sprites[0]?.cellOffset).toMatchObject({ x: 4 });
  });

  it('says the pivot came from the anchor rather than from the default', () => {
    // The field would otherwise assert `DEFAULT_BOTTOM_CENTRE` on a pivot the reader had moved,
    // which is the one claim it exists to make honestly.
    const manifest = buildManifest({
      ...input,
      cell: { ...cell, anchor: { x: 'LEFT', y: 'TOP' } },
    });

    expect(manifest.sprites.map((sprite) => sprite.pivotSource)).toStrictEqual([
      'CELL_ANCHOR',
      'CELL_ANCHOR',
      'CELL_ANCHOR',
    ]);
  });

  it('still links a duplicate to its canonical', () => {
    const manifest = buildManifest({
      ...input,
      cell,
      duplicates: [
        { canonical: BOXES[0] as SpriteBox, duplicates: [{ box: BOXES[1] as SpriteBox, exact: true }] },
      ],
    });

    expect(manifest.sprites.map((sprite) => sprite.duplicateOf)).toStrictEqual([null, 1, null]);
  });
});

describe('encodeManifest', () => {
  it('writes JSON a person can read and a parser can round-trip', () => {
    const manifest = buildManifest(input);
    const text = new TextDecoder().decode(encodeManifest(manifest));

    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "sprites": [');
    expect(JSON.parse(text)).toStrictEqual(JSON.parse(JSON.stringify(manifest)));
  });
});
