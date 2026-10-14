/**
 * The deepest mip level at which a bleed gutter of `padding` pixels is still at least one texel
 * wide, or `null` when it is narrower than a texel on the base level itself.
 *
 * Each mip level halves the gutter, so 2ⁿ px lasts to mip n and is half a texel at mip n + 1, where
 * a filtered sample starts reading the neighbouring cell. No gutter protects a whole chain: a
 * 2048 px texture runs to mip 11, which would take a 2048 px gutter.
 */
export function deepestCleanMip(padding: number): number | null {
  if (padding < 1) return null;
  let mip = 0;
  for (let width = padding / 2; width >= 1; width /= 2) mip += 1;
  return mip;
}
