import type { AtlasCanvasSize, SpriteFit } from '../../types/atlas.ts';

interface AtlasFitDetailProps {
  readonly usableBounds: number;
  /** `null` where the studio names no component size, so there is nothing to check against. */
  readonly fit: SpriteFit | null;
  /**
   * Which of the two ways {@link fit} came back `null`: a sheet that states assemblies rather than a
   * field nobody has filled in.
   *
   * Such a sheet's components are the parts one subject is cut into — a rig's, but equally a pose
   * library's or an ITEM part library's — so the size stated for it is not a component's and a cell
   * cannot be checked against it. **It is the sheet's answer
   * and not the field's**, because nothing the reader types into that box will make this row
   * checkable — so asking them for a size here, as the branch below does, would promise a check that
   * is never going to arrive. Which is also why the prose says what the *sheet* states rather than
   * what the reader has: it has to be true while the box is empty.
   */
  readonly assembled: boolean;
  readonly canvasSize: AtlasCanvasSize;
  /** The smallest texture that seats every component at 1:1, or `null` where none does. */
  readonly smallestCanvas: AtlasCanvasSize | null;
}

/** The figures in a sentence, monospaced, so they can be read off the way the metric tiles are. */
function Pixels({ children }: { readonly children: string }) {
  return <span className="font-mono text-ink">{children}</span>;
}

/**
 * The sentence under {@link AtlasFitSummary}'s badge — what the fit actually means, and the one
 * thing worth doing about it.
 *
 * Four separate returns rather than a ternary chain, because the states share a frame and nothing
 * else: each says a different thing, about different numbers, and the advice that follows differs in
 * kind. Every branch ends on a second sentence, unconditionally — why there is nothing to check, a
 * studio field to fill in, a texture size that would fit, the one that could be dropped to, or the
 * fact that there is no smaller one. "Already at the floor" is the case a trailing conditional would
 * silently render as nothing, leaving the reader at a full stop with no idea whether the advice was
 * missing or absent.
 *
 * **The first two are both `fit === null`, and telling them apart is the point.** One is a sheet
 * where naming a component size would make this row work; the other is a sheet where no size can,
 * because its components are pieces of the subject any size stated there describes. Only the first is
 * worth asking the reader for anything, which is why the ask lives in that branch alone and can name
 * the studio's label outright.
 */
export function AtlasFitDetail({
  usableBounds,
  fit,
  canvasSize,
  smallestCanvas,
  assembled,
}: AtlasFitDetailProps) {
  if (fit === null && assembled) {
    return (
      <p className="text-xs leading-relaxed text-ink-muted">
        Each component has <Pixels>{`${usableBounds} × ${usableBounds} px`}</Pixels> to itself. This sheet’s
        components are the pieces one subject is cut into, and a cell holds one piece — while a size stated
        for this sheet describes the whole subject. Checking a piece against the whole would pass whatever
        came back, so the fit stands down, and there is no size you could give it that would change that.
      </p>
    );
  }

  if (fit === null) {
    return (
      <p className="text-xs leading-relaxed text-ink-muted">
        Each component has <Pixels>{`${usableBounds} × ${usableBounds} px`}</Pixels> to itself. Name a{' '}
        <span className="font-semibold">Target Component Size</span> in the studio —{' '}
        <span className="font-mono">48 × 96 px</span>, say — and this becomes a check against it.
      </p>
    );
  }

  const target = `${fit.target.width} × ${fit.target.height} px`;

  if (fit.scale === 0) {
    return (
      <p className="text-xs leading-relaxed text-ink-muted">
        <Pixels>{target}</Pixels> needs a {Math.max(fit.target.width, fit.target.height)} px cell at 1:1, and
        this texture affords {usableBounds} px.{' '}
        {smallestCanvas === null
          ? 'No texture size offered holds it — the component count, the gutter or the target size has to give.'
          : `A ${smallestCanvas} px texture is the smallest that holds it.`}
      </p>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      <Pixels>{target}</Pixels> lands as <Pixels>{`${fit.placedWidth} × ${fit.placedHeight} px`}</Pixels> in a{' '}
      {usableBounds} px cell.{' '}
      {smallestCanvas !== null && smallestCanvas < canvasSize
        ? `${smallestCanvas} px is the smallest texture that still seats every component at 1:1 — everything above it is resolution you are choosing to buy.`
        : 'No smaller texture in the list seats them all, so this is the floor for these components.'}
    </p>
  );
}
