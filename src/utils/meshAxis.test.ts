import { describe, expect, it } from 'vitest';
import { sequence } from '../test/sequence.ts';
import type { PixelGrid } from '../types/quantiser.ts';
import { type BoundaryLine, boundaryClusters } from './boundaryClusters.ts';
import { boundEndCells } from './boundEndCells.ts';
import { meshAxis } from './meshAxis.ts';

/**
 * A dense, noisy axis of evidence: boundaries drifting at `pitch`, and spurious peaks between them.
 *
 * The shape of the axis a noisy sheet gives at a pitch just off the grid — hundreds of detected
 * lines, many of them a pixel or two from where any walk expects one, which is what exercises the
 * walk's choice between near candidates and its ties.
 */
function denseAxis(extent: number, pitch: number, seed: number): Float64Array {
  const next = sequence(seed);
  const axis = new Float64Array(extent);
  for (let position = 0; position < extent; position += 1) axis[position] = next() * 10;
  for (let boundary = pitch; boundary < extent; boundary += pitch) {
    const position = Math.round(boundary + (next() - 0.5));
    if (position < extent) axis[position] = 100 + next() * 100;
  }
  for (let position = 0; position < extent; position += 1) {
    if (next() < 0.1) axis[position] = 100 + next() * 100;
  }
  return axis;
}

/**
 * The walk `meshAxis` documents, stated by brute force: every line as the anchor, every step
 * scanning every line for the nearest within tolerance (the lower on a tie), and the walk with the
 * best fit, then mass, then the earliest anchor taking the axis.
 *
 * `meshAxis` finds the same lines far faster; this is the answer it must keep giving.
 */
function bruteForceAxis(lines: readonly BoundaryLine[], extent: number, grid: PixelGrid): number[] {
  const tolerance = Math.max(1, Math.floor(grid / 3));
  const nearest = (expected: number): BoundaryLine | null => {
    let found: BoundaryLine | null = null;
    for (const line of lines) {
      const distance = Math.abs(line.position - expected);
      if (distance <= tolerance && (found === null || distance < Math.abs(found.position - expected))) {
        found = line;
      }
    }
    return found;
  };

  let best: { starts: number[]; fit: number; mass: number } | null = null;
  for (const anchor of lines) {
    const walk = { starts: [anchor.position], fit: tolerance + 1, mass: anchor.mass };
    for (const direction of [1, -1]) {
      let expected = anchor.position + direction * grid;
      while (direction > 0 ? expected < extent : expected >= 1) {
        const found = nearest(expected);
        if (found !== null) {
          walk.fit += tolerance + 1 - Math.abs(found.position - expected);
          walk.mass += found.mass;
        }
        const position = found?.position ?? expected;
        walk.starts.push(position);
        expected = position + direction * grid;
      }
    }
    if (best === null || walk.fit > best.fit || (walk.fit === best.fit && walk.mass > best.mass)) best = walk;
  }
  if (best === null) throw new Error('The premise failed: a dense axis anchors a walk.');
  return boundEndCells(
    [...best.starts].sort((a, b) => a - b),
    extent,
    grid,
  );
}

describe('meshAxis', () => {
  const cases: readonly { extent: number; pitch: number; grid: PixelGrid; seed: number }[] = [
    { extent: 1024, pitch: 2.2, grid: 2, seed: 1 },
    { extent: 1024, pitch: 2.2, grid: 2, seed: 2 },
    { extent: 900, pitch: 3.3, grid: 3, seed: 3 },
    { extent: 700, pitch: 4.1, grid: 4, seed: 4 },
    { extent: 600, pitch: 6.4, grid: 6, seed: 5 },
    { extent: 500, pitch: 7.7, grid: 8, seed: 6 },
  ];

  it.each(cases)(
    'walks a dense axis at grid $grid to the cuts the brute-force walk gives (seed $seed)',
    ({ extent, pitch, grid, seed }) => {
      const axis = denseAxis(extent, pitch, seed);
      const lines = boundaryClusters(axis).filter((line) => line.position < extent);
      // The premise: the axis is dense, so the walk has many near candidates to choose between.
      expect(lines.length).toBeGreaterThan(extent / (pitch + 2));

      expect(meshAxis(axis, extent, grid)).toEqual(bruteForceAxis(lines, extent, grid));
    },
  );
});
