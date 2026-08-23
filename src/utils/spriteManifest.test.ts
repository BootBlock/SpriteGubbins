import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
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
  width: 40,
  height: 40,
  scale: 1,
  boxes: BOXES,
  duplicates: [],
  names: [],
  cell: null,
  sheet: null,
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

  it('names the sprites from the inventory when the counts agree', () => {
    const manifest = buildManifest({ ...input, names: ['heads-south', 'heads-west', 'heads-north'] });

    expect(manifest.named).toBe(true);
    expect(manifest.sprites.map((sprite) => sprite.name)).toStrictEqual([
      'heads-south',
      'heads-west',
      'heads-north',
    ]);
  });

  it('numbers them instead when the sheet came back a different length', () => {
    // The mapping is positional, so a sheet one component short would otherwise have every name
    // after the gap describing the wrong piece — silently, in a file a pipeline believes.
    const manifest = buildManifest({ ...input, names: ['heads-south', 'heads-west'] });

    expect(manifest.named).toBe(false);
    expect(manifest.sprites.map((sprite) => sprite.name)).toStrictEqual([
      'sprite-01',
      'sprite-02',
      'sprite-03',
    ]);
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
      },
    });

    expect(manifest.sheet).toMatchObject({ ordinal: 1, total: 10, components: 12 });
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
