/**
 * The keyboard bypass: one link, ahead of everything else, straight to the view.
 *
 * Nine controls stand between the top of the document and the first control the page is *about* —
 * the wordmark, five tabs and four chrome actions — and they are there again on every navigation
 * and every reload, because the chrome is what the app renders around each view. Tabbing past them
 * to reach a form is what WCAG 2.4.1 (Bypass Blocks, level A) exists to spare someone.
 *
 * It carries no guidance card, which the rule in `CLAUDE.md` names as an exception rather than an
 * oversight. Two reasons, and either would be enough: the link's own text is already the whole
 * explanation, and `ControlTooltip` reveals on `:focus-visible` — which is precisely and only how
 * this link is ever reached, so the card would open on the first Tab of every keyboard session,
 * over the chrome the reader is trying to leave.
 */
export function SkipLink() {
  return (
    /*
      Held above the top of the viewport and brought down by the `focus:` variant, which is one
      property decided by one utility and one variant of it. The usual spelling of this reveal pairs
      `sr-only` with a focus variant that undoes it, and that is the wrong shape here: the two set
      `position` to different values, and a fixed placement beside them would be a third — three
      declarations of one property on one element, resolved by where each lands in the generated
      stylesheet, which no call site can see. Naming the class here would also emit it, since
      Tailwind scans this comment as readily as the markup below.

      Nothing eases. Every other reveal in the app is worth dwelling on; this one answers a Tab the
      reader is pressing to find it, and travel time is time spent not knowing whether it worked.

      Fixed indigo, not the view's colour: it is reachable from every view, which is the footing the
      chrome's own Copy Prompt stands on. `z-50` clears the sticky header's `z-40` — the header is a
      `glass-panel`, so its `backdrop-filter` makes it a stacking context, and a link painted
      underneath it would be focused and invisible.
    */
    <a
      href="#main-content"
      className="fixed left-4 -top-24 z-50 rounded-xl bg-accent-strong px-4 py-2 text-xs font-extrabold text-foundry-950 shadow-lg ring-1 ring-accent-soft/40 focus:top-4"
    >
      Skip to main content
    </a>
  );
}
