import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { GridMesh, Rgba } from '../types/quantiser.ts';
import { applyPalette } from './applyPalette.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { boundaryMesh, regularMesh } from './gridMesh.ts';
import { packColor, packedColorAt, pixelOffset } from './imageData.ts';
import { lineAwareWinner, lumaOf } from './lineVote.ts';
import { buildPalette } from './wuQuantiser.ts';
import { quantiseImage } from './quantiseImage.ts';

/**
 * The line-aware vote, against the fixtures its thresholds were accepted on.
 *
 * The acceptance criteria came before the implementation, deliberately: each sheet-level test
 * carries a validity guard proving the *old* rule fails on it — a rescued line only means something
 * on a sheet the majority vote demonstrably breaks — and each inertness test is byte-level, because
 * “mostly unchanged” is where a vote change hides.
 */

/** The body colour of every fixture — a mid brown, luma 115. */
const BODY: Rgba = { r: 150, g: 110, b: 70, a: 255 };
/** A drawn outline's near-black, luma 14 — 101 below the body, twice the flatness gate. */
const INK: Rgba = { r: 16, g: 14, b: 18, a: 255 };
/** A bright trim's gold, luma 202 — 87 above the body. */
const GOLD: Rgba = { r: 235, g: 205, b: 90, a: 255 };

const packed = (color: Rgba): number => packColor(color);

/**
 * Logical art upscaled with per-cell drift — each logical pixel becomes a run of 6 or 7, so a
 * regular mesh at 6 accumulates misalignment and the art's lines land astride its cells, holding a
 * different share of each. The straddle that breaks an outline, reproduced deterministically.
 */
function upscaleDrifting(art: (x: number, y: number) => Rgba, cells: number): ImageData {
  const spans = Array.from({ length: cells }, (_, index) => (index % 3 === 1 ? 7 : 6));
  const starts = [0];
  for (const span of spans) starts.push((starts[starts.length - 1] ?? 0) + span);
  const size = starts[cells] ?? 0;
  const cellOf = (position: number): number => {
    let cell = 0;
    for (const [index, start] of starts.entries()) if (position >= start && index < cells) cell = index;
    return cell;
  };
  return imageFrom(size, size, (x, y) => art(cellOf(x), cellOf(y)));
}

/** Per mesh cell: its bounds, and how many of its pixels carry the given colour. */
function cellShares(
  image: ImageData,
  mesh: GridMesh,
  colour: Rgba,
): { left: number; top: number; count: number; area: number }[] {
  const target = packed(colour);
  const cells: { left: number; top: number; count: number; area: number }[] = [];
  for (const [rowIndex, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[rowIndex + 1] ?? image.height, image.height);
    for (const [columnIndex, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[columnIndex + 1] ?? image.width, image.width);
      let count = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          if (packedColorAt(image.data, pixelOffset(image.width, x, y)) === target) count += 1;
        }
      }
      cells.push({ left, top, count, area: (right - left) * (bottom - top) });
    }
  }
  return cells;
}

const cellColour = (aligned: ImageData, left: number, top: number): number =>
  packedColorAt(aligned.data, pixelOffset(aligned.width, left, top));

describe('lineAwareWinner', () => {
  const tally = (entries: [Rgba, number][]): Map<number, number> =>
    new Map(entries.map(([c, n]) => [packed(c), n]));

  it('keeps a dark line at exactly an eighth of the cell, and refuses it just under', () => {
    // 4 of 32 is exactly the floor — a one-pixel contour slice in a large cell. `≥` is the claim.
    const atFloor = tally([
      [BODY, 28],
      [INK, 4],
    ]);
    expect(lineAwareWinner(atFloor, packed(BODY))).toBe(packed(INK));

    const underFloor = tally([
      [BODY, 29],
      [INK, 3],
    ]);
    expect(lineAwareWinner(underFloor, packed(BODY))).toBeNull();
  });

  it('holds a bright trim to a quarter — twice the dark floor, the bloom asymmetry', () => {
    // The same share that keeps a dark line: an eighth. A bright speck at that share is what
    // generators bloom highlights into, and it must not claim the cell.
    const eighthBright = tally([
      [BODY, 28],
      [GOLD, 4],
    ]);
    expect(lineAwareWinner(eighthBright, packed(BODY))).toBeNull();

    const quarterBright = tally([
      [BODY, 24],
      [GOLD, 8],
    ]);
    expect(lineAwareWinner(quarterBright, packed(BODY))).toBe(packed(GOLD));
  });

  it('leaves a flat-ish cell alone, whatever the shares — the range gate', () => {
    // Two tones 11 luma apart: a shaded surface, not a line over a body.
    const shadedDarker: Rgba = { r: 120, g: 100, b: 80, a: 255 };
    const shadedLighter: Rgba = { r: 100, g: 120, b: 90, a: 255 };
    const shaded = tally([
      [shadedLighter, 27],
      [shadedDarker, 9],
    ]);
    expect(lineAwareWinner(shaded, packed(shadedLighter))).toBeNull();
  });

  it('refuses a candidate nearer the winner than the gap, however dark the cell runs', () => {
    // Body plus its own shadow 20 luma below, plus enough true dark elsewhere to open the range:
    // the shadow qualifies on share but is shading, and keeping it would trade the surface for it.
    const shadow: Rgba = { r: 110, g: 85, b: 55, a: 255 };
    expect(lumaOf(packed(BODY)) - lumaOf(packed(shadow))).toBeLessThan(32);
    const mixed = tally([
      [BODY, 24],
      [shadow, 8],
      // Dark enough to open the range gate, too scarce to qualify on share.
      [INK, 2],
    ]);
    expect(lineAwareWinner(mixed, packed(BODY))).toBeNull();
  });

  it('leaves an exact half-split alone — a texture or a straddled boundary, not a line', () => {
    const even = tally([
      [INK, 18],
      [GOLD, 18],
    ]);
    expect(lineAwareWinner(even, packed(INK))).toBeNull();
    expect(lineAwareWinner(even, packed(GOLD))).toBeNull();
  });

  it('stands aside for a keyed cell, and never mistakes transparency for the darkest colour', () => {
    const clear: Rgba = { r: 0, g: 0, b: 0, a: 0 };
    // Keyed winner: the cell is background, and stays it.
    const keyedCell = tally([
      [clear, 20],
      [INK, 16],
    ]);
    expect(lineAwareWinner(keyedCell, packed(clear))).toBeNull();

    // Transparent minority: zero channels would read as luma 0 — the darkest thing in the cell —
    // and the only genuine tones here are one surface, which the range gate must see.
    const fringed = tally([
      [BODY, 30],
      [clear, 6],
    ]);
    expect(lineAwareWinner(fringed, packed(BODY))).toBeNull();
  });

  it('never installs a trim over an ink winner — the cell is already a line', () => {
    // A gold emblem bordered in black: the cells along the border are majority ink with a gold
    // sliver riding in, and the mass sits so low that the skew reads as bright. Overruling the
    // ink here is how the emblem's border thins away cell by cell — the exact breakage the
    // rescue exists to prevent, manufactured by the rescue itself until this guard existed.
    const majorityInk = tally([
      [INK, 24],
      [GOLD, 8],
    ]);
    expect(lineAwareWinner(majorityInk, packed(INK))).toBeNull();

    // The unambiguous case: half ink, the rest split between a mid tone and white. The winner is
    // ink, and no bright minority may take the cell from it.
    const white: Rgba = { r: 255, g: 255, b: 255, a: 255 };
    const mid: Rgba = { r: 128, g: 128, b: 128, a: 255 };
    const halfInk = tally([
      [INK, 18],
      [mid, 4],
      [white, 14],
    ]);
    expect(lineAwareWinner(halfInk, packed(INK))).toBeNull();
  });

  it('still lets ink overrule a bright winner — a pale body carrying a line is the straddle', () => {
    // The mirror case is kept deliberately: a winner in the brightest quarter under an ink slice
    // is indistinguishable, from the tally, from a pale body straddled by a genuine outline — and
    // the cost of keeping the ink when the winner was really a trim is a line drawn a cell thick,
    // where the cost of the other choice is a line broken.
    const paleBody = tally([
      [GOLD, 28],
      [INK, 4],
    ]);
    expect(lineAwareWinner(paleBody, packed(GOLD))).toBe(packed(INK));
  });

  it('never reads a translucent bucket as a tone, however dark its channels', () => {
    // A soft edge a source PNG brought with it: nearly invisible, channels near black. Its luma
    // says nothing about how it reads, so it is neither a candidate nor part of the median — and
    // with it excluded, this cell is one opaque surface and the range gate sees nothing to do.
    const smudge: Rgba = { r: 8, g: 8, b: 8, a: 120 };
    const smudged = tally([
      [BODY, 28],
      [smudge, 4],
    ]);
    expect(lineAwareWinner(smudged, packed(BODY))).toBeNull();

    // A translucent winner: the rescue stands aside entirely rather than judging tones it cannot
    // read.
    const translucentWinner = tally([
      [smudge, 24],
      [INK, 8],
    ]);
    expect(lineAwareWinner(translucentWinner, packed(smudge))).toBeNull();
  });

  it('resolves an equal-luma tie to the first-counted colour, deterministically', () => {
    const inkTwin: Rgba = { r: 18, g: 14, b: 12, a: 255 };
    expect(lumaOf(packed(inkTwin))).toBe(lumaOf(packed(INK)));
    const tied = tally([
      [BODY, 24],
      [INK, 6],
      [inkTwin, 6],
    ]);
    expect(lineAwareWinner(tied, packed(BODY))).toBe(packed(INK));
  });
});

describe('alignToGrid, line-aware', () => {
  /**
   * A box outline on logical rows and columns 4 and 7 of a 10 × 10 body — positions chosen against
   * the drift so its slices land at a third of a mesh cell, squarely inside both floors' at-risk
   * window.
   */
  const onRing = (x: number, y: number): boolean =>
    ((x === 4 || x === 7) && y >= 4 && y <= 7) || ((y === 4 || y === 7) && x >= 4 && x <= 7);

  it('keeps every straddled slice of a dark outline the plain vote breaks', () => {
    const sheet = upscaleDrifting((x, y) => (onRing(x, y) ? INK : BODY), 10);
    const mesh = regularMesh(sheet.width, sheet.height, 6, { x: 0, y: 0 });

    // At-risk cells hold a qualifying minority slice of the line: an eighth or more, short of a
    // majority. The drift must produce some, or this fixture proves nothing.
    const shares = cellShares(sheet, mesh, INK);
    const atRisk = shares.filter((cell) => cell.count * 8 >= cell.area && cell.count * 2 < cell.area);
    expect(atRisk.length).toBeGreaterThanOrEqual(3);

    // Validity guard: the plain vote loses every one of them — the broken outline, reproduced.
    const plain = alignToGrid(sheet, mesh);
    for (const cell of atRisk) {
      expect(cellColour(plain, cell.left, cell.top)).toBe(packed(BODY));
    }

    // The rescue keeps them all, and every majority-ink cell stays ink — 100% survival.
    const rescued = alignToGrid(sheet, mesh, true);
    for (const cell of atRisk) {
      expect(cellColour(rescued, cell.left, cell.top)).toBe(packed(INK));
    }
    for (const cell of shares.filter((c) => c.count * 2 > c.area)) {
      expect(cellColour(rescued, cell.left, cell.top)).toBe(packed(INK));
    }
  });

  it('keeps a straddled bright trim too, at its stricter floor', () => {
    const sheet = upscaleDrifting((x, y) => (onRing(x, y) ? GOLD : BODY), 10);
    const mesh = regularMesh(sheet.width, sheet.height, 6, { x: 0, y: 0 });

    const shares = cellShares(sheet, mesh, GOLD);
    const atRisk = shares.filter((cell) => cell.count * 4 >= cell.area && cell.count * 2 < cell.area);
    expect(atRisk.length).toBeGreaterThanOrEqual(3);

    const plain = alignToGrid(sheet, mesh);
    const rescued = alignToGrid(sheet, mesh, true);
    for (const cell of atRisk) {
      expect(cellColour(plain, cell.left, cell.top)).toBe(packed(BODY));
      expect(cellColour(rescued, cell.left, cell.top)).toBe(packed(GOLD));
    }
  });

  it('is byte-identical on flat panels, straddles included', () => {
    // Four flat panels whose lumas sit within the flatness gate of each other: the straddled cells
    // hold two tones of one surface, and the two modes must not differ by a byte anywhere.
    const panels: Rgba[] = [
      { r: 120, g: 100, b: 80, a: 255 },
      { r: 100, g: 120, b: 90, a: 255 },
      { r: 135, g: 105, b: 95, a: 255 },
      { r: 110, g: 115, b: 70, a: 255 },
    ];
    const sheet = upscaleDrifting(
      (x, y) => panels[(Math.floor(x / 5) + Math.floor(y / 5) * 2) % 4] ?? BODY,
      10,
    );
    const mesh = regularMesh(sheet.width, sheet.height, 6, { x: 0, y: 0 });

    expect(channels(alignToGrid(sheet, mesh, true))).toEqual(channels(alignToGrid(sheet, mesh)));
  });

  it('is byte-identical on crisp gridded art aligned at its own scale', () => {
    // Every cell is one colour, so there is never a minority to weigh — at any grid, including 1.
    const crisp = imageFrom(24, 24, (x, y) => {
      const index = Math.floor(y / 4) * 6 + Math.floor(x / 4);
      return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
    });
    const atScale = regularMesh(24, 24, 4, { x: 0, y: 0 });
    expect(channels(alignToGrid(crisp, atScale, true))).toEqual(channels(alignToGrid(crisp, atScale)));

    const single = regularMesh(24, 24, 1, { x: 0, y: 0 });
    expect(channels(alignToGrid(crisp, single, true))).toEqual(channels(alignToGrid(crisp, single)));
  });

  it('changes nothing about a keyed field, and keeps a line inside keyed cells’ art', () => {
    // The ring sheet with its outer body keyed away: cells astride the sheet's edge hold
    // transparency and art together, and the rescue must judge only the art.
    const clear: Rgba = { r: 0, g: 0, b: 0, a: 0 };
    const sheet = upscaleDrifting(
      (x, y) => (x === 0 || y === 0 || x === 9 || y === 9 ? clear : onRing(x, y) ? INK : BODY),
      10,
    );
    const mesh = regularMesh(sheet.width, sheet.height, 6, { x: 0, y: 0 });

    const rescued = alignToGrid(sheet, mesh, true);
    const plain = alignToGrid(sheet, mesh);
    // Every cell the plain vote keyed stays keyed, and the line is still rescued somewhere inside
    // the art — the two halves of "the rescue judges only the art": transparency is never
    // resurrected into colour, and its presence in a cell does not cost that cell its line.
    let rescuedInk = 0;
    for (const top of mesh.y) {
      for (const left of mesh.x) {
        if (cellColour(plain, left, top) === packed(clear)) {
          expect(cellColour(rescued, left, top)).toBe(packed(clear));
        }
        if (cellColour(plain, left, top) === packed(BODY) && cellColour(rescued, left, top) === packed(INK)) {
          rescuedInk += 1;
        }
      }
    }
    expect(rescuedInk).toBeGreaterThanOrEqual(1);
  });

  it('keeps a gold emblem’s black border whole — the rescue must never thin the linework it serves', () => {
    // A gold fill inside an ink ring, drifted astride the mesh: the border cells are majority ink
    // with a gold sliver riding in, and an unguarded bright pass repainted three of them gold —
    // the exact broken-line failure this feature exists to prevent, manufactured by the feature.
    // Every cell the plain vote resolves to ink must still be ink with the rescue on.
    const inEmblem = (x: number, y: number): boolean => x >= 5 && x <= 6 && y >= 5 && y <= 6;
    const sheet = upscaleDrifting((x, y) => (onRing(x, y) ? INK : inEmblem(x, y) ? GOLD : BODY), 10);
    const mesh = regularMesh(sheet.width, sheet.height, 6, { x: 0, y: 0 });

    const plain = alignToGrid(sheet, mesh);
    const rescued = alignToGrid(sheet, mesh, true);
    let inkCells = 0;
    for (const top of mesh.y) {
      for (const left of mesh.x) {
        if (cellColour(plain, left, top) === packed(INK)) {
          inkCells += 1;
          expect(cellColour(rescued, left, top)).toBe(packed(INK));
        }
      }
    }
    // The fixture must actually hold border cells, or the loop above asserted nothing.
    expect(inkCells).toBeGreaterThanOrEqual(8);
  });
});

describe('quantiseImage, line-aware', () => {
  const ringArt = (x: number, y: number): Rgba =>
    ((x === 4 || x === 7) && y >= 4 && y <= 7) || ((y === 4 || y === 7) && x >= 4 && x <= 7) ? INK : BODY;

  it('reaches the vote when a reduction ran, and stays out of it when none did', () => {
    const sheet = upscaleDrifting(ringArt, 10);

    // Quantised at 5 — against the art's own 6-and-7 rhythm, so the mesh cannot seat a cut on
    // every edge and the ring lands astride cells whatever the walker does. (At 6 the walker
    // follows the drift exactly and nothing straddles, which is the mesh doing its job.)
    const mismatched = { grid: 5, key: null, vote: 'DOMINANT' } as const;

    // With colours left alone there is no honest tally to read shares from, and the pipeline must
    // be byte-identical to the plain vote it has always run.
    const unrestricted = quantiseImage(sheet, {
      ...mismatched,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: null,
    });
    const composedPlain = downscaleNearest(
      alignToGrid(sheet, boundaryMesh(sheet, 5)),
      boundaryMesh(sheet, 5),
    );
    expect(channels(unrestricted.image)).toEqual(channels(composedPlain));

    // With a reduction in force the pipeline differs from the same composition run without the
    // rescue — the proof the flag reaches the vote, which a green suite with it wired off would
    // not give. The palette asks for the sheet's own two colours, so the reduction itself is an
    // identity and the rescue is the only thing left to differ by.
    const voteSource = applyPalette(sheet, buildPalette(sheet, 4));
    const mesh = boundaryMesh(sheet, 5);
    const composedWithoutRescue = downscaleNearest(alignToGrid(voteSource, mesh), mesh);
    const reduced = quantiseImage(sheet, {
      ...mismatched,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 4 },
    });
    expect(channels(reduced.image)).not.toEqual(channels(composedWithoutRescue));
  });

  it('is inert at a grid of 1, where every cell is a single pixel', () => {
    const sheet = upscaleDrifting(ringArt, 10);
    const reduced = quantiseImage(sheet, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 4 },
    });
    // A one-pixel cell has one bucket, so the palette alone decides — and the sheet is already
    // flat colours the palette holds, so the result is the sheet itself.
    expect(channels(reduced.image)).toEqual(channels(sheet));
  });

  it('is deterministic — the same sheet and settings give the same bytes twice', () => {
    const sheet = upscaleDrifting(ringArt, 10);
    const settings = {
      grid: 6,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 4 },
    } as const;
    expect(channels(quantiseImage(sheet, settings).image)).toEqual(
      channels(quantiseImage(sheet, settings).image),
    );
  });
});
