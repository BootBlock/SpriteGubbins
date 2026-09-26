import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { keyBackground } from '../utils/keyBackground.ts';
import { createImage } from '../utils/imageData.ts';
import { sequence } from './sequence.ts';

/**
 * A sheet of 25 generated-style sprites, each drawn at its own pitch and phase, with the art each
 * pixel was drawn from — the ground truth a mesh can be scored against.
 *
 * The corpus in `test_sprites/` is real generator output, but nothing records where its cells truly
 * are, so a mesh measured on it can only be scored by a proxy. This sheet is the other half: art
 * whose every cell is known, carrying the two things a generated sheet does to it. **Each sprite is
 * placed at its own phase** (and, where `pitch` asks, its own pitch), the way a sheet resampled sprite
 * by sprite comes back, and **the whole sheet is softened** with a three-tap blur and ±6 of noise
 * before it is keyed off its magenta field, the way resampling leaves it.
 *
 * Each sprite is a disc of pixel art in a 120-pixel slot of a 5 × 5 layout, coloured in blocks of
 * three cells with one cell in seven a detail of its own. `truth` is the art before the softening,
 * transparent wherever no sprite was drawn. `globalPhase` gives every sprite the same phase, which
 * is the sheet a single lattice suits and the case a per-sprite mesh must not make worse.
 *
 * Deterministic for a seed, so a figure measured on it reproduces exactly.
 */
export interface PhasedSpriteSheet {
  readonly keyed: ImageData;
  readonly truth: ImageData;
}

const SLOT = 120;
const LAYOUT = 5;
const INSET = 8;
const NOISE = 12;
const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;
const PALETTE: readonly (readonly [number, number, number])[] = [
  [30, 30, 40],
  [200, 60, 50],
  [60, 160, 80],
  [220, 200, 90],
  [70, 90, 200],
  [180, 180, 190],
  [120, 70, 40],
];

export function phasedSpriteSheet(
  seed: number,
  pitch: (next: () => number) => number,
  globalPhase = false,
): PhasedSpriteSheet {
  const next = sequence(seed);
  const size = SLOT * LAYOUT;
  const truth = createImage(size, size);
  const shared = { x: next(), y: next() };

  for (let slot = 0; slot < LAYOUT * LAYOUT; slot += 1) {
    const cell = pitch(next);
    const phaseX = (globalPhase ? shared.x : next()) * cell;
    const phaseY = (globalPhase ? shared.y : next()) * cell;
    const drawn = SLOT - 2 * INSET;
    const cells = Math.floor(drawn / cell);
    const blocks = Array.from({ length: 64 }, () => Math.floor(next() * PALETTE.length));
    const art = Array.from({ length: cells * cells }, (_, index) => {
      const column = index % cells;
      const row = Math.floor(index / cells);
      const dx = (column + 0.5) / cells - 0.5;
      const dy = (row + 0.5) / cells - 0.5;
      const detail = next() < 1 / 7 ? Math.floor(next() * PALETTE.length) : null;
      if (dx * dx + dy * dy >= 0.2) return -1;
      return detail ?? blocks[(Math.floor(column / 3) * 8 + Math.floor(row / 3)) % 64] ?? 0;
    });

    const left = (slot % LAYOUT) * SLOT + INSET;
    const top = Math.floor(slot / LAYOUT) * SLOT + INSET;
    for (let y = top; y < top + drawn; y += 1) {
      const row = Math.floor((y - top - phaseY) / cell);
      for (let x = left; x < left + drawn; x += 1) {
        const column = Math.floor((x - left - phaseX) / cell);
        if (row < 0 || column < 0 || row >= cells || column >= cells) continue;
        const color = PALETTE[art[row * cells + column] ?? -1];
        if (color === undefined) continue;
        const at = (y * size + x) * 4;
        truth.data.set([color[0], color[1], color[2], 255], at);
      }
    }
  }

  const softened = soften(truth);
  const image = createImage(size, size);
  for (let at = 0; at < image.data.length; at += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      image.data[at + channel] = (softened[at + channel] ?? 0) + (next() - 0.5) * NOISE;
    }
    image.data[at + 3] = 255;
  }
  return { keyed: keyBackground(image, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE }).image, truth };
}

/**
 * The truth on its magenta field, blurred by three taps across and then three down, clamped at the
 * sheet's edges. Kept in floating point until the noise is added, so the blur rounds once.
 */
function soften(truth: ImageData): Float64Array {
  const { width, height, data } = truth;
  const field = new Float64Array(data.length);
  for (let at = 0; at < data.length; at += 4) {
    const opaque = (data[at + 3] ?? 0) > 0;
    field[at] = opaque ? (data[at] ?? 0) : MAGENTA.r;
    field[at + 1] = opaque ? (data[at + 1] ?? 0) : MAGENTA.g;
    field[at + 2] = opaque ? (data[at + 2] ?? 0) : MAGENTA.b;
  }
  const pass = (source: Float64Array, step: number, along: (pixel: number) => number, extent: number) => {
    const out = new Float64Array(source.length);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const position = along(pixel);
      const before = position > 0 ? pixel - step : pixel;
      const after = position < extent - 1 ? pixel + step : pixel;
      for (let channel = 0; channel < 3; channel += 1) {
        out[pixel * 4 + channel] =
          ((source[before * 4 + channel] ?? 0) +
            (source[pixel * 4 + channel] ?? 0) +
            (source[after * 4 + channel] ?? 0)) /
          3;
      }
    }
    return out;
  };
  const across = pass(field, 1, (pixel) => pixel % width, width);
  return pass(across, width, (pixel) => Math.floor(pixel / width), height);
}
