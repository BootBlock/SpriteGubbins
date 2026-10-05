import type { OverlayLine } from '../types/overlayLine.ts';
import { formatAnatomyComponent } from './additionalAnatomy.ts';
import { balancedChunks } from './balancedChunks.ts';
import { entrySlots } from './entrySlots.ts';

/** One drawing of a reader's piece, cut from its line so a sheet boundary can fall inside the piece. */
interface Drawing extends OverlayLine {
  readonly whole: OverlayLine;
  readonly at: number;
}

/**
 * An icon set's overlay lines cut into sheets of at most `capacity` drawings: **the fewest sheets the
 * drawings fill, and every line whole where that many sheets allow it.**
 *
 * `balancedChunks` never splits a line, which is right for the library, whose tier marks and sweep stages
 * are compared side by side. A reader's piece is a run of like drawings, and kept whole it can cost a
 * generation: fourteen library pieces and a `Mark ×17` are thirty-one drawings, which two sheets hold,
 * but whole lines cut them fourteen, sixteen and one. So where whole lines need more sheets than the
 * drawings fill, or a piece is worth more than a sheet, each reader's piece is cut into its drawings,
 * balanced with the library's lines, and the drawings a sheet holds are joined back into one line naming
 * them in turn (`ComponentEntry.parts`): `Mark ×15: drawings 1 to 15 of the 17`. Pure.
 */
export function overlayRuns(
  lines: readonly OverlayLine[],
  capacity: number,
): readonly (readonly OverlayLine[])[] {
  const fewest = Math.ceil(lines.reduce((sum, line) => sum + line.count, 0) / capacity);
  const whole = balancedChunks(lines, capacity);
  if (whole.length <= fewest && lines.every((line) => line.count <= capacity)) return whole;
  const drawings = lines.flatMap((line): readonly OverlayLine[] =>
    line.piece === undefined || line.count === 1
      ? [line]
      : Array.from({ length: line.count }, (_, at): Drawing => ({ ...line, count: 1, whole: line, at })),
  );
  return balancedChunks(drawings, capacity).map(joined);
}

/** A sheet's lines with each run of one piece's drawings joined back into one line. */
function joined(run: readonly OverlayLine[]): readonly OverlayLine[] {
  const lines: OverlayLine[] = [];
  let held: Drawing[] = [];
  const close = (): void => {
    const [first] = held;
    if (first !== undefined) lines.push(lineOf(first.whole, first.at, held.length));
    held = [];
  };
  for (const line of run) {
    if (!isDrawing(line)) {
      close();
      lines.push(line);
      continue;
    }
    if (held[0] !== undefined && held[0].whole !== line.whole) close();
    held.push(line);
  }
  close();
  return lines;
}

function isDrawing(line: OverlayLine): line is Drawing {
  return 'whole' in line;
}

/** `count` drawings of a reader's piece from drawing `at`, as one line: the piece's own where it is all of them. */
function lineOf(whole: OverlayLine, at: number, count: number): OverlayLine {
  const { piece, entry } = whole;
  if (piece === undefined || count === whole.count) return whole;
  return {
    ...whole,
    count,
    entry: {
      ...entry,
      text: `${formatAnatomyComponent({ name: piece.name, count })}: ${count === 1 ? `drawing ${String(at + 1)}` : `drawings ${String(at + 1)} to ${String(at + count)}`} of the ${String(piece.count)}`,
      count,
      parts: entrySlots(entry, 'run').slice(at, at + count),
    },
  };
}
