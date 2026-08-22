import { describe, expect, it } from 'vitest';
import { detailedMarks, detailedSheet } from '../test/detailedSheet.ts';
import { imageFrom, soften } from '../test/images.ts';
import { estimateMeshPeriod } from './meshPeriod.ts';
import { estimateProfilePeriod } from './profilePeriod.ts';
import { measureSheetScale } from './pixelGrid.ts';

describe('estimateProfilePeriod', () => {
  it('reads a detailed drifting sheet through the detail its interior marks put on both axes', () => {
    // The reported failure in miniature: a real generated sheet offered no candidate at all,
    // because its interior detail — straps, crosses, rivets — puts strong edges between the cell
    // boundaries, and every reading taken over the axis as a whole was measuring the boundaries
    // against a level those edges had already lifted. Autocorrelation uses the whole profile
    // unthresholded, and the pixel grid's periodic component peaks at the pitch however much
    // detail rides on top — which is why this reading answered the sheet first.
    const sheet = detailedSheet(detailedMarks);

    expect(estimateProfilePeriod(sheet)).toBe(6);
    expect(measureSheetScale(sheet)).toEqual({ grid: 6, measurement: 'REPEAT_DISTANCE' });

    // The line-list reading refused this sheet for as long as its chance floor was the axis mean:
    // the marks lifted the floor past the cell boundaries, the boundaries dropped out, and the
    // spacings left behind agreed about nothing. Measured against the background rather than the
    // mean the boundaries survive, so the two readings now answer the same sheet the same way —
    // which is the agreement `boundaryClusters` exists to make possible, and the reason its own
    // suite asserts the line positions rather than only the pitch they imply.
    expect(estimateMeshPeriod(sheet)).toBe(6);
  });

  it('reads the same sheet wherever the marks fall, not just where the fixture put them', () => {
    // The same sheet with its detail phase-shifted one cell each way. An estimator calibrated to
    // the mark placement rather than the pitch would answer one of these and refuse the other,
    // which is a coin flip wearing a threshold's clothes.
    const shifted = detailedSheet((cellX, cellY) => cellX % 4 === 3 && cellY % 3 === 0);
    expect(estimateProfilePeriod(shifted)).toBe(6);
  });

  it('never lets one axis’s detail cancel the other’s fundamental into a doubled offer', () => {
    // Marks in every second column-cell anticorrelate the columns profile at the true pitch. When
    // the axes were summed before reading, that cancellation erased the rows axis's clean 6/7
    // fundamental and the reading offered 13 — the double, which merges the art's cells for good —
    // on a sheet the pipeline previously refused outright. Read per axis, the polluted axis
    // disagrees or refuses, and either way no doubled offer survives; whether the answer is the
    // true 6 or an honest refusal, it must never be the ghost.
    const alternatingColumns = detailedSheet((cellX) => cellX % 2 === 0);
    expect(estimateProfilePeriod(alternatingColumns)).not.toBe(13);

    const alternatingBoth = detailedSheet((cellX, cellY) => cellX % 2 === 0 && cellY % 2 === 0);
    expect(estimateProfilePeriod(alternatingBoth)).not.toBe(13);
  });

  it('settles a fractional pitch on a neighbouring integer, not on its doubled ghost', () => {
    // Art at six and a half pixels puts its sharpest integer-lag peak at thirteen — twice the
    // truth. The harmonic descent asks whether the half-lag's window carries nearly the peak's own
    // support, which a split fundamental does, and offering either neighbouring integer is right:
    // the mesh snaps cut by cut, so six or seven both follow the art.
    const pitch = 6.5;
    const cells = 18;
    const size = Math.round(cells * pitch);
    const sheet = soften(
      imageFrom(size, size, (x, y) => {
        const cellX = Math.floor(x / pitch);
        const cellY = Math.floor(y / pitch);
        const index = cellY * cells + cellX;
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    const period = estimateProfilePeriod(sheet);
    expect(period === 6 || period === 7, `settled on ${String(period)}`).toBe(true);
  });

  it('settles a small fractional pitch off its tripled ghost, which no halving reaches', () => {
    // Art at four and a third puts its sharpest integer-lag peak at thirteen — *three* times the
    // truth, so a descent that only halves lands on six-and-a-half's neighbours and stops. The
    // divisor-of-three leg is what brings it home; either neighbour of the true pitch is right.
    const pitch = 4.35;
    const cells = 28;
    const size = Math.round(cells * pitch);
    const sheet = soften(
      imageFrom(size, size, (x, y) => {
        const cellX = Math.floor(x / pitch);
        const cellY = Math.floor(y / pitch);
        const index = cellY * cells + cellX;
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    const period = estimateProfilePeriod(sheet);
    expect(period === 4 || period === 5, `settled on ${String(period)}`).toBe(true);
  });

  it('reads sprites on a field through the envelope that buried the raw correlation', () => {
    // The real returned sheet in miniature: most of the canvas is a flat key field, and the art
    // sits in blocks — so the profile rides a low-frequency envelope that correlates *every* pair
    // of nearby lags, and on the real sheet the raw correlation sat between 0.5 and 0.75
    // everywhere while the true pitch was a bump of 0.05 on top. Differencing the profile is what
    // lets the pitch's comb stand alone; this fixture is the class that failed without it.
    const sheet = soften(
      imageFrom(320, 320, (x, y) => {
        const inSprite =
          (x >= 20 && x < 150 && y >= 20 && y < 150) || (x >= 170 && x < 300 && y >= 170 && y < 300);
        if (!inSprite) return { r: 250, g: 40, b: 245, a: 255 };
        const cellX = Math.floor(x / 6);
        const cellY = Math.floor(y / 6);
        return {
          r: 30 + (cellX % 3) * 70,
          g: 60 + (cellY % 3) * 65,
          b: 40 + ((cellX + cellY) % 4) * 45,
          a: 255,
        };
      }),
    );

    expect(estimateProfilePeriod(sheet)).toBe(6);
    expect(measureSheetScale(sheet)).toEqual({ grid: 6, measurement: 'REPEAT_DISTANCE' });
  });

  it('refuses smooth artwork, whose profile has no structure to correlate', () => {
    const gradient = imageFrom(128, 128, (x, y) => ({
      r: Math.round((x / 127) * 255),
      g: Math.round((y / 127) * 255),
      b: 128,
      a: 255,
    }));

    expect(estimateProfilePeriod(gradient)).toBeNull();
    expect(measureSheetScale(gradient)).toBeNull();
  });

  it('refuses noise, which correlates with nothing', () => {
    const noise = imageFrom(96, 96, (x, y) => ({
      r: ((x * 374761393 + y * 668265263) >>> 3) % 256,
      g: ((x * 668265263 + y * 374761393) >>> 5) % 256,
      b: ((x * 69119 + y * 374761393) >>> 7) % 256,
      a: 255,
    }));

    expect(estimateProfilePeriod(noise)).toBeNull();
  });

  it('refuses edges at assorted spacings, which fit no period', () => {
    const boundaries = [0, 5, 9, 17, 31, 40, 44, 58];
    const cellOf = (position: number): number => {
      let cell = 0;
      for (const [index, start] of boundaries.entries()) if (position >= start) cell = index;
      return cell;
    };
    const sheet = imageFrom(64, 64, (x, y) => {
      const index = cellOf(y) * 32 + cellOf(x);
      return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
    });

    expect(estimateProfilePeriod(sheet)).toBeNull();
  });

  it('refuses a component layout masquerading as a pixel pitch, via the repeat floor', () => {
    // Five sprites laid out evenly repeat at a spacing well inside the manual range's ceiling —
    // content periodicity, not a pixel grid. Eight repeats across the shorter edge is what a
    // layout never has, so the ceiling this reading searches under excludes the layout's spacing
    // before its correlation is ever consulted.
    const sheet = imageFrom(320, 320, (x, y) => {
      const inSprite = x % 64 < 40 && y % 64 < 40;
      return inSprite ? { r: 40, g: 160, b: 70, a: 255 } : { r: 250, g: 240, b: 235, a: 255 };
    });

    // The layout pitch of 64 is above floor(320 / 8) = 40, so it is out of the search range. What is
    // left is the 40-pixel span of a sprite within its own cell, and *both* axes peak there at
    // 0.508 — identically, because the layout is the same on both. Neither can vouch for it (its
    // double at 80 carries nothing), and two axes that cannot corroborate nothing, however exactly
    // they agree. That is the refusal, and it is the one this reading owes a content periodicity.
    expect(estimateProfilePeriod(sheet)).toBeNull();
  });

  it('reads a pitch of two, which the lattice reading’s borrowed floor could not reach', () => {
    // The floor this reading used to take from `estimatePixelGrid` was 4, derived from the width of
    // a lattice window — a bound on a measurement this one does not make. Five of the eight sheets
    // in `test_sprites/` are drawn at 2, 3 or ≈3.4, and two of them were being answered at *twice*
    // their pitch because the descent could go no finer. A correlation has nothing that degenerates
    // at 2: the comb is at every even lag and the troughs are at every odd one.
    const sheet = imageFrom(96, 96, (x, y) => {
      const index = Math.floor(y / 2) * 48 + Math.floor(x / 2);
      return { r: (index * 71 + 40) % 200, g: (index * 149 + 80) % 200, b: (index * 37 + 120) % 200, a: 255 };
    });

    expect(estimateProfilePeriod(sheet)).toBe(2);
  });

  it('descends to the comb’s own tooth, never into the gap between two of them', () => {
    // Two-pixel cells whose colours repeat every four cells, so the most-supported peak sits at a
    // *multiple* of the pitch — 24 down the columns and 8 across the rows — and the answer is only
    // reached by descending. That is the shape a real sheet has: measured on
    // `test_sprites/cyborg_healer.png`, whose pitch is 2, the search settles on 8.
    //
    // A ±1 window centred on the *odd* lag of a period-2 comb collects both flanking teeth and
    // outscores either of them, so a descent weighing its candidates by windowed mass alone lands
    // on a lag the correlation is negative at — on the healer sheet, 0.885 at lag 3 against 0.53 at
    // lag 2, and it descended from 8 to 3. At the old floor of 4 that lag was unreachable and mass
    // and shape never disagreed, so nothing had to say which was being asked for. A genuine
    // harmonic is a local maximum; the gap between two teeth is not.
    const group = 4;
    const sheet = imageFrom(192, 192, (x, y) => {
      const index = (Math.floor(y / 2) % group) * group + (Math.floor(x / 2) % group);
      return { r: (index * 83 + 30) % 220, g: (index * 151 + 90) % 220, b: (index * 47 + 140) % 220, a: 255 };
    });

    expect(estimateProfilePeriod(sheet)).toBe(2);
  });

  it('reads plain regular pitch too, where the earlier readings would normally answer first', () => {
    const sheet = soften(
      imageFrom(64, 64, (x, y) => {
        const index = Math.floor(y / 8) * 8 + Math.floor(x / 8);
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    expect(estimateProfilePeriod(sheet)).toBe(8);
  });
});
