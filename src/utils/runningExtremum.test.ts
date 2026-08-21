import { describe, expect, it } from 'vitest';
import { type ExtremumField, extremumScratch, runningExtremum } from './runningExtremum.ts';

/**
 * The obvious answer, written out longhand: walk the clipped window and keep the best, ties going to
 * the earliest owner.
 *
 * The whole value of the block algorithm is that it gives *this* answer without doing this work, so
 * this is what it is checked against — at every radius against every length, rather than on a
 * handful of chosen cases, because the failures it is prone to are the ones that only appear when a
 * window happens to straddle a block boundary a particular way.
 */
function bruteForce(keys: readonly number[], radius: number, takeMin: boolean): number[] {
  return keys.map((_, index) => {
    let best = Math.max(index - radius, 0);
    for (let scan = best + 1; scan <= Math.min(index + radius, keys.length - 1); scan += 1) {
      const key = keys[scan] ?? 0;
      const bestKey = keys[best] ?? 0;
      if (key === bestKey ? scan < best : takeMin ? key < bestKey : key > bestKey) best = scan;
    }
    return best;
  });
}

function run(keys: readonly number[], radius: number, takeMin: boolean): number[] {
  const input: ExtremumField = {
    keys: Int16Array.from(keys),
    owners: Int32Array.from(keys.map((_, index) => index)),
  };
  const output: ExtremumField = {
    keys: new Int16Array(keys.length),
    owners: new Int32Array(keys.length),
  };
  runningExtremum(
    input,
    output,
    { start: 0, stride: 1, length: keys.length },
    radius,
    takeMin,
    extremumScratch(keys.length),
  );
  return Array.from(output.owners);
}

/** A deterministic spread of values with plenty of repeats, so the tie-break is genuinely exercised. */
function sample(length: number): number[] {
  return Array.from({ length }, (_, index) => (index * 37) % 11);
}

describe('runningExtremum', () => {
  it('agrees with a brute-force window at every radius and length, both directions', () => {
    for (let length = 1; length <= 24; length += 1) {
      const keys = sample(length);
      for (let radius = 0; radius <= 6; radius += 1) {
        for (const takeMin of [true, false]) {
          expect({ length, radius, takeMin, owners: run(keys, radius, takeMin) }).toEqual({
            length,
            radius,
            takeMin,
            owners: bruteForce(keys, radius, takeMin),
          });
        }
      }
    }
  });

  it('breaks a tie on the earliest owner, whichever direction is being taken', () => {
    // Every value equal, so the answer is decided entirely by the tie-break: the leftmost position
    // the window reaches.
    const flat = [5, 5, 5, 5, 5, 5, 5];
    expect(run(flat, 2, true)).toEqual([0, 0, 0, 1, 2, 3, 4]);
    expect(run(flat, 2, false)).toEqual([0, 0, 0, 1, 2, 3, 4]);
  });

  it('clips the window to the line rather than wrapping or reading past it', () => {
    // The minimum sits at the very end, so a window that ran off the front would be the only way to
    // reach anything smaller than the values around it.
    expect(run([9, 8, 7, 6, 0], 1, true)).toEqual([1, 2, 3, 4, 4]);
    expect(run([0, 6, 7, 8, 9], 1, false)).toEqual([1, 2, 3, 4, 4]);
  });

  it('returns each position itself at a radius of zero', () => {
    expect(run(sample(9), 0, true)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('walks a strided line, which is how a column is read out of an image', () => {
    // Three columns of three; the middle column holds 4, 1, 7 and is read with a stride of 3.
    const keys = [9, 4, 9, 9, 1, 9, 9, 7, 9];
    const input: ExtremumField = {
      keys: Int16Array.from(keys),
      owners: Int32Array.from(keys.map((_, index) => index)),
    };
    const output: ExtremumField = { keys: new Int16Array(9), owners: new Int32Array(9) };
    runningExtremum(input, output, { start: 1, stride: 3, length: 3 }, 1, true, extremumScratch(3));
    // Every position in that column sees the 1 at index 4, and no position outside it is touched.
    expect([output.owners[1], output.owners[4], output.owners[7]]).toEqual([4, 4, 4]);
    expect([output.owners[0], output.owners[3]]).toEqual([0, 0]);
  });

  it('carries the winner’s key beside its owner, so a second axis can compare them', () => {
    const input: ExtremumField = {
      keys: Int16Array.from([9, 2, 9]),
      owners: Int32Array.from([0, 1, 2]),
    };
    const output: ExtremumField = { keys: new Int16Array(3), owners: new Int32Array(3) };
    runningExtremum(input, output, { start: 0, stride: 1, length: 3 }, 1, true, extremumScratch(3));
    expect(Array.from(output.keys)).toEqual([2, 2, 2]);
  });

  it('compares keys outside the byte range, which is what the transparency sentinels need', () => {
    // 256 stands for "no pixel here" while a minimum is being taken, and must lose to a real 255.
    expect(run([256, 255, 256], 1, true)).toEqual([1, 1, 1]);
    // −1 is the mirror while a maximum is being taken, and must lose to a real 0.
    expect(run([-1, 0, -1], 1, false)).toEqual([1, 1, 1]);
  });
});
