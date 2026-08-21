/**
 * How far apart two axis-aligned boxes sit, in drawn pixels — `0` where they touch or overlap.
 *
 * The **Chebyshev** separation, which is the eight-connected metric `spriteSegments` labels with: a
 * box three pixels away diagonally is three away, not four and a bit. Measuring it any other way
 * would put a caller and the labelling on two different definitions of "next to", and a gap of 1
 * would then mean something different depending on which direction a piece had drifted.
 *
 * Two callers need it and they hold their boxes in different shapes — the gap merge grows mutable
 * bounds through a fixed-point loop, and the duplicate snap checks a write region against the
 * segmentation's own `SpriteBox` list. So this takes plain edges rather than either shape: one
 * definition, no conversion, and nothing allocated inside a walk that is quadratic in the boxes.
 *
 * Edges are **inclusive left and top, exclusive right and bottom**, which is how a raster range is
 * stated everywhere else in this directory. A separation of `0` therefore means the two share at
 * least one pixel position or sit directly against one another; `1` means exactly one empty pixel
 * lies between them, which is the closest two boxes can sit without their contents being
 * eight-connected.
 */
export function boxSeparation(
  leftA: number,
  topA: number,
  rightA: number,
  bottomA: number,
  leftB: number,
  topB: number,
  rightB: number,
  bottomB: number,
): number {
  const across = Math.max(leftA - rightB, leftB - rightA, 0);
  const down = Math.max(topA - bottomB, topB - bottomA, 0);
  return Math.max(across, down);
}
