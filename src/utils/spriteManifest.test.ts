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

describe('encodeManifest', () => {
  it('writes JSON a person can read and a parser can round-trip', () => {
    const manifest = buildManifest(input);
    const text = new TextDecoder().decode(encodeManifest(manifest));

    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "sprites": [');
    expect(JSON.parse(text)).toStrictEqual(JSON.parse(JSON.stringify(manifest)));
  });
});
