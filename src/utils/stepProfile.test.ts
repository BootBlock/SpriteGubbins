import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { stepProfile } from './stepProfile.ts';

/** Rows of pixels whose red channel takes the values given, left to right. */
function strips(rows: readonly (readonly number[])[]): ImageData {
  const width = rows[0]?.length ?? 0;
  return imageFrom(width, rows.length, (x, y) => ({ r: rows[y]?.[x] ?? 0, g: 0, b: 0, a: 255 }));
}

/** An axis rounded to six places, so a share of a third can be compared. */
function rounded(axis: Float64Array): number[] {
  return Array.from(axis, (value) => Number(value.toFixed(6)));
}

describe('stepProfile', () => {
  it('totals each step by the column and the row it falls on', () => {
    const image = imageFrom(3, 2, (x, y) => ({ r: x * 10, g: y * 30, b: 0, a: 255 }));
    const profile = stepProfile(image);

    expect(Array.from(profile.columns)).toEqual([0, 20, 20]);
    expect(Array.from(profile.rows)).toEqual([0, 90]);
    expect(profile.total).toBe(130);
  });

  it('reads a crisp axis by its transitions, one vote a line, whatever each step’s size', () => {
    // Nine steps a row, six of them no change: drawn crisply, where a change is a fact and its size is
    // not evidence. The faint step and the loud pair are a third of each row's vote, so the loud rows
    // carry the column no further than the quiet one does.
    const crisp = [0, 0, 0, 2, 2, 2, 212, 2, 2, 2];
    const { columns, columnEvidence } = stepProfile(strips([crisp, crisp]));

    expect(columnEvidence.reading).toBe('TRANSITIONS');
    expect(Array.from(columns)).toEqual([0, 0, 0, 4, 0, 0, 420, 420, 0, 0]);
    expect(rounded(columnEvidence.values)).toEqual([0, 0, 0, 0.666667, 0, 0, 0.666667, 0.666667, 0, 0]);
  });

  it('gives a loud crisp line the same one vote as a quiet one', () => {
    // Three crisp rows cross the same boundary, two by 2 and one by 210. By magnitude the loud row owns
    // the column; read by transitions, each row is one vote.
    const { columns, columnEvidence } = stepProfile(
      strips([
        [0, 0, 0, 2, 2, 2],
        [0, 0, 0, 2, 2, 2],
        [0, 0, 0, 210, 210, 210],
      ]),
    );

    expect(columns[3]).toBe(214);
    expect(columnEvidence.values[3]).toBe(3);
  });

  it('counts a line crowded with changes by its transitions too, on an axis drawn crisply', () => {
    // The third row changes on every step, which is a resampled line by its own count — but two rows of
    // three are crisp, so the axis is, and the crowded row splits its vote five ways.
    const { columnEvidence } = stepProfile(
      strips([
        [0, 0, 0, 9, 9, 9],
        [0, 0, 0, 9, 9, 9],
        [0, 90, 0, 90, 0, 90],
      ]),
    );

    expect(columnEvidence.reading).toBe('TRANSITIONS');
    expect(rounded(columnEvidence.values)).toEqual([0, 0.2, 0.2, 2.2, 0.2, 0.2]);
  });

  it('reads a resampled axis by its magnitude, exactly as the readings before it did', () => {
    // Every neighbouring pair differs, so a count is the same everywhere and size is what separates the
    // edge from the ringing beside it. The evidence is the magnitude itself, not a copy of it.
    const { columns, columnEvidence } = stepProfile(
      strips([
        [0, 1, 2, 42, 43, 44],
        [0, 1, 2, 3, 4, 5],
        [0, 0, 0, 30, 30, 30],
      ]),
    );

    expect(columnEvidence.reading).toBe('MAGNITUDE');
    expect(columnEvidence.values).toBe(columns);
    expect(Array.from(columns)).toEqual([0, 2, 2, 71, 2, 2]);
  });

  it('reads a keyed sheet’s resampled art by magnitude, though most of each row is no change', () => {
    // The field either side of the sprite is flat, so eleven of each row's sixteen steps are unchanged —
    // but inside the sprite the colour changes pixel after pixel, and only the two silhouette steps sit
    // beside an unchanged one. Two isolated transitions of seven is a resampled line.
    const keyed = [0, 0, 0, 0, 0, 0, 40, 47, 41, 52, 44, 50, 0, 0, 0, 0, 0];
    const { columns, columnEvidence } = stepProfile(strips([keyed, keyed]));

    expect(columnEvidence.reading).toBe('MAGNITUDE');
    expect(columnEvidence.values).toBe(columns);
  });

  it('reads an axis with no change on it as magnitude, holding nothing', () => {
    const { columnEvidence, rowEvidence } = stepProfile(
      imageFrom(5, 5, () => ({ r: 9, g: 9, b: 9, a: 255 })),
    );

    expect(columnEvidence.reading).toBe('MAGNITUDE');
    expect(Array.from(columnEvidence.values)).toEqual([0, 0, 0, 0, 0]);
    expect(Array.from(rowEvidence.values)).toEqual([0, 0, 0, 0, 0]);
  });
});
