import { describe, expect, it } from 'vitest';
import { unfilterScanlines } from '../test/pngScanlines.ts';
import { filterScanlines, PNG_FILTER_NONE, PNG_FILTERS } from './pngFilter.ts';

const ROW_BYTES = 12;
const HEIGHT = 7;

/** A deterministic pseudo-random field, so every filter has something non-trivial to predict. */
function noise(): Uint8Array {
  const raw = new Uint8Array(ROW_BYTES * HEIGHT);
  let state = 7;
  for (let at = 0; at < raw.length; at += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    raw[at] = state % 256;
  }
  return raw;
}

describe('filterScanlines', () => {
  it.each(PNG_FILTERS)('reconstructs exactly under filter %i', (type) => {
    const raw = noise();
    const filtered = filterScanlines({
      raw,
      rowBytes: ROW_BYTES,
      height: HEIGHT,
      bytesPerPixel: 4,
      candidates: [type],
    });
    expect(filtered).toHaveLength((ROW_BYTES + 1) * HEIGHT);
    expect([...unfilterScanlines(filtered, ROW_BYTES, HEIGHT, 4)]).toEqual([...raw]);
  });

  it('reconstructs exactly when every filter is a candidate', () => {
    const raw = noise();
    const filtered = filterScanlines({
      raw,
      rowBytes: ROW_BYTES,
      height: HEIGHT,
      bytesPerPixel: 4,
      candidates: PNG_FILTERS,
    });
    expect([...unfilterScanlines(filtered, ROW_BYTES, HEIGHT, 4)]).toEqual([...raw]);
  });

  it('takes Sub on a row that repeats one pixel, where every residual is zero', () => {
    const raw = new Uint8Array(ROW_BYTES * HEIGHT);
    for (let at = 0; at < raw.length; at += 1) raw[at] = [9, 40, 200, 255][at % 4] ?? 0;
    const filtered = filterScanlines({
      raw,
      rowBytes: ROW_BYTES,
      height: HEIGHT,
      bytesPerPixel: 4,
      candidates: PNG_FILTERS,
    });
    // Row 0 has nothing above it, so Sub is the only filter that flattens it; later rows are
    // identical to the one above and Up flattens them at the same cost, which ties to the lower type.
    expect(filtered[0]).toBe(1);
    expect(filtered[1 + ROW_BYTES]).toBe(2);
    // Under Sub, only the first pixel of row 0 has no left neighbour, so everything after it is zero.
    expect([...filtered.subarray(1 + 4, 1 + ROW_BYTES)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('breaks a Paeth tie towards the byte above, not the one above-left', () => {
    // The one tie the predictor can actually be observed making. A tie between `left` and `up` is
    // unobservable, though not unreachable: equal distances there mean either `left = up`, where
    // both answers are the same byte, or `left + up = 2 × upLeft`, which puts `upLeft` at distance
    // zero and wins outright whichever way the first comparison is written. (Checked over all 16.7
    // million byte triples: 98,048 tie there, and every one falls into one of those two — 65,536
    // with equal values, 32,768 with `upLeft` at zero, 256 of them both.) This is the
    // second comparison — `up` at 1 and `upLeft` at 1, with `left` further out at 2 — where the
    // spec's `pb <= pc` takes `up`. The round trip cannot catch a flip here, because the
    // reconstruction states the same tie-break, so the residual itself is what is asserted.
    // Row 0 is `upLeft`, `up`; row 1 is `left`, and then the byte being predicted.
    const raw = Uint8Array.from([10, 8, 11, 0]);
    const filtered = filterScanlines({
      raw,
      rowBytes: 2,
      height: 2,
      bytesPerPixel: 1,
      candidates: [4],
    });
    // `up` is 8, so the residual is 0 − 8. Taking `upLeft` (10) would leave 246.
    expect(filtered[5]).toBe(248);
  });

  it('leaves every scanline unfiltered when only filter 0 is offered', () => {
    const raw = noise();
    const filtered = filterScanlines({
      raw,
      rowBytes: ROW_BYTES,
      height: HEIGHT,
      bytesPerPixel: 1,
      candidates: PNG_FILTER_NONE,
    });
    for (let y = 0; y < HEIGHT; y += 1) expect(filtered[y * (ROW_BYTES + 1)]).toBe(0);
    expect([...unfilterScanlines(filtered, ROW_BYTES, HEIGHT, 1)]).toEqual([...raw]);
  });

  it('counts a residual of 255 as costing one, not 255', () => {
    // One row of a constant, then the same row one lower. Under Up every residual of the second row
    // is 255 — which a signed reading costs at 1 a byte and an unsigned one at 255, so an unsigned
    // reading would take filter 0 (12 bytes of 127) instead. Only those two are offered, because
    // Paeth predicts this row exactly and would otherwise win on its own merits.
    const raw = new Uint8Array(ROW_BYTES * 2).fill(128);
    for (let at = ROW_BYTES; at < raw.length; at += 1) raw[at] = 127;
    const filtered = filterScanlines({
      raw,
      rowBytes: ROW_BYTES,
      height: 2,
      bytesPerPixel: 4,
      candidates: [0, 2],
    });
    expect(filtered[ROW_BYTES + 1]).toBe(2);
  });
});
