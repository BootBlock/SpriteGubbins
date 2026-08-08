import type { AtlasCanvasSize, SpriteFit } from '../../types/atlas.ts';

interface AtlasFitDetailProps {
  readonly usableBounds: number;
  /** `null` where the studio names no component size, so there is nothing to check against. */
  readonly fit: SpriteFit | null;
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
 * Three separate returns rather than a ternary chain, because the three states share a frame and
 * nothing else: each says a different thing, about different numbers, and the advice that follows
 * differs in kind. Every branch ends on a second sentence, unconditionally — a studio field to fill
 * in, a texture size that would fit, the one that could be dropped to, or the fact that there is no
 * smaller one. "Already at the floor" is the case a trailing conditional would silently render as
 * nothing, leaving the reader at a full stop with no idea whether the advice was missing or absent.
 */
export function AtlasFitDetail({ usableBounds, fit, canvasSize, smallestCanvas }: AtlasFitDetailProps) {
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
