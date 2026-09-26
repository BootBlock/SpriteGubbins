/**
 * Whether any of a pixel's four orthogonal neighbours is part of the field.
 *
 * 4-adjacency rather than 8: a diagonal neighbour touches at a corner, and a corner contact is not
 * where a blend comes from. Edge pixels simply have fewer neighbours to ask — the bounds checks are
 * what stop a row wrapping onto the one above it, which would erode a stripe down the opposite margin.
 */
export function touchesField(field: Uint8Array, width: number, height: number, index: number): boolean {
  const x = index % width;
  const y = (index - x) / width;

  return (
    (x > 0 && field[index - 1] === 1) ||
    (x < width - 1 && field[index + 1] === 1) ||
    (y > 0 && field[index - width] === 1) ||
    (y < height - 1 && field[index + width] === 1)
  );
}
