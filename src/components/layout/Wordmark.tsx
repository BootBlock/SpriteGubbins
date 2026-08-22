import { REPOSITORY_URL } from '../../constants/about.ts';
import { Badge } from '../common/Badge.tsx';

/**
 * The app's name in the corner of every view, and the way out to its source.
 *
 * That destination is the claim the whole application rests on: it runs in the browser, sends
 * nothing anywhere, and the only way anyone can *know* that is to go and read it. The About
 * section makes the same offer in prose at the foot of the architecture tab; this makes it from
 * wherever the user happens to be.
 *
 * Written as an anchor rather than routed through `ExternalLink`, which is a text link for prose —
 * an underlined run of `accent-soft` with a trailing arrow, neither of which a two-line branding
 * block wants. What does come along is the reason that component gives for its two attributes: the
 * app is installable, so in `standalone` display mode there is no back button, and a link followed
 * in place strands the user on somebody else's site with no way home. The screen-reader warning
 * comes with them, because the visible arrow it stands in for is the part not being reused.
 *
 * `title` is the sighted half of that same warning, and it is carrying the one thing the visible
 * content cannot say: a wordmark reading "Sprite Gubbins" gives no hint that pressing it leaves.
 *
 * `rounded-xl` is here for the global `:focus-visible` ring, which follows the border radius — a
 * square ring around a row of rounded chrome is the tell that a control was never tabbed to.
 */
export function Wordmark() {
  return (
    <a
      href={REPOSITORY_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="View the Sprite Gubbins source code on GitHub — opens in a new tab"
      className="group flex items-center gap-3 rounded-xl"
    >
      {/* The tile holds the glyph; it is not a canvas for the palette — see `bg-spectrum`. */}
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-foundry-700 text-xl shadow-md ring-1 ring-foundry-600 transition-all duration-585 group-hover:scale-105 group-hover:rotate-6 group-hover:ring-tab/60"
      >
        👾
      </span>
      <span>
        <span className="flex items-center gap-2 text-xl font-black tracking-tight">
          <span className="heading-spectrum animate-spectrum-pan">Sprite Gubbins</span>
          <Badge tone="accent">Serverless</Badge>
        </span>
        {/* 585 rather than the layer default: this and the tile above are one hover, and a subtitle
            settling before the glyph it belongs to has finished turning reads as two events. */}
        <span className="block text-xs text-ink-faint transition-colors duration-585 group-hover:text-ink-muted">
          Modular sprite-sheet prompt architecture
        </span>
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
