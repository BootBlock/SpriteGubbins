import { pixelOffset, readPixel } from '../utils/imageData.ts';
import { imageFrom } from './images.ts';
import { sequence } from './sequence.ts';

/**
 * The image with a `share` of its pixels each moved by up to `amount` per channel, from a seeded
 * stream — the re-encode noise that puts a transition on every column and so takes a crisp sheet
 * past `detectPixelGrid` to the estimated readings.
 */
export function jitter(image: ImageData, share: number, amount: number, seed: number): ImageData {
  const next = sequence(seed);
  const nudge = (channel: number) =>
    Math.max(0, Math.min(255, channel + Math.round((next() * 2 - 1) * amount)));
  return imageFrom(image.width, image.height, (x, y) => {
    const pixel = readPixel(image.data, pixelOffset(image.width, x, y));
    if (next() >= share) return pixel;
    return { r: nudge(pixel.r), g: nudge(pixel.g), b: nudge(pixel.b), a: pixel.a };
  });
}
