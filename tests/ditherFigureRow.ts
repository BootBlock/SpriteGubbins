import { meanCellDistance, toConeField, type ConeField } from './cellDistance.ts';

/**
 * One row of the two dither tables `DITHER_CHOICES` and `DITHER_SHORTLIST` state: the mean
 * scaled-OKLab distance from `reference` per pixel, then over aligned 4 × 4 and 8 × 8 blocks.
 *
 * Three decimals rather than the tables' own one or two, because a figure such as 15.75 rounds
 * either way, and a pin at the tables' precision could not tell the two apart.
 */
export function ditherFigureRow(
  reference: ConeField,
  image: ImageData,
  width: number,
  height: number,
): readonly number[] {
  const field = toConeField(image);
  return [1, 4, 8].map((block) =>
    Number(meanCellDistance(reference, field, width, height, block).toFixed(3)),
  );
}
