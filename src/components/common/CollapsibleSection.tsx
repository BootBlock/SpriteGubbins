import { useId } from 'react';
import type { ReactNode } from 'react';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import type { SectionDefinition } from '../../types/ui.ts';
import { sectionElementId } from '../../utils/sectionElementId.ts';

interface CollapsibleSectionProps extends SectionDefinition {
  readonly heading: string;
  /**
   * The group's current settings, shown in the header **while it is folded**. Never empty for a
   * group that always holds values — see `studioDigests.ts` for why silence is not an option here.
   */
  readonly digest: string;
  readonly children: ReactNode;
}

/**
 * One foldable run of settings, with its current values in the header when it is shut.
 *
 * **Collapsed means summarised, not hidden.** Every field inside reaches the compiled prompt whether
 * this is open or not, so folding may hide the controls but must never hide the configuration —
 * which is what the digest is for. It is rendered only while shut: open, each control carries its
 * own label, and repeating the values would be noise.
 *
 * **The digest gets its own line, and the whole panel's width.** Sharing the heading's line means
 * competing for it, and the group most worth folding is the one with the most to say — the seven
 * render-style settings run to about 110 characters, which is more than half a panel. On one line
 * they were clipped mid-identifier at the very width this layout was designed for. Beneath the
 * heading and clamped to two lines, they fit whole; the second column of the grid is also what
 * aligns the values under the heading rather than ragged against the right rail.
 *
 * Native `<details>`/`<summary>` rather than a button and an `aria-expanded` to keep in sync: the
 * platform supplies the button semantics, the expanded state and the keyboard handling for free, and
 * Chromium's find-in-page opens it without any click. The heading lives *inside* the summary —
 * valid, since `<summary>` takes phrasing content intermixed with heading content — because screen
 * reader users navigate by pulling up a list of headings, and a plain button would make the whole
 * group invisible to that. Nothing interactive may join it in there; the summary **is** the control,
 * which is why the panel's expand-all button sits in the panel header instead.
 *
 * **The digest is the control's *description*, not part of its name.** Left to name-from-content it
 * would announce as "Render style PIXEL_ART · CLEAN_PRODUCTION · HIGH_RESOLUTION · …, collapsed,
 * button" — six identifiers in front of the state a user is listening for. `aria-labelledby` pins
 * the name to the heading alone, and `aria-describedby` offers the values after it.
 *
 * The digest stays **ordinary, navigable text** while doing that: `aria-hidden` would have taken it
 * out of the name just as well, but a description is announced once at whatever verbosity the
 * reader is set to and can never be re-read, and a hidden node cannot be reached with a virtual
 * cursor at all. A hundred characters of technical identifiers is exactly the kind of thing someone
 * wants to go back over word by word. This way it is both — announced on focus, and still there to
 * browse.
 *
 * **Controlled from the store**, so the caret, the digest and the element cannot disagree, and so a
 * fold survives the tab switch that unmounts the view. `onToggle` rather than an intercepted click:
 * it is the one event that hears about a keyboard toggle, a click, *and* a find-in-page expansion.
 *
 * **Deliberately not animated open**, and the caret's rotation is the whole of the motion. Two
 * things were tried and rejected on measurement. A height transition (`interpolate-size` plus a
 * `block-size` transition on `::details-content`) needs `overflow: hidden` on that pseudo-element,
 * and a new clipping ancestor here would slice the combo box's suggestion list in half on any
 * browser taking `useAnchoredSurface`'s un-lifted fallback path. A fade on the content looked like
 * the free alternative — the reasoning being that a `content-visibility: hidden` subtree resets its
 * animations, so it would replay on each open with no state at all. It does not: measured in Edge
 * and in Chromium, a keyframe animation on a child of a `<details>` fires `animationstart` exactly
 * once and still reports a finished animation while the group is shut, so closing and reopening
 * plays nothing. Rendering state there is preserved, not reset. An animation that runs on first
 * mount and never again is worse than none, so there isn't one.
 *
 * `SheetSplitRun`'s bare `<details>` is deliberately **not** converted to this. It folds one run's
 * prompt text inside a modal list: it has no configuration to digest, and its open state is per-run
 * scratch that has no business outliving the modal in a global store. Widening this component to
 * cover it would mean optional ids and optional digests — speculative generality for one call site.
 */
export function CollapsibleSection({ id, defaultOpen, heading, digest, children }: CollapsibleSectionProps) {
  const isOpen = useSectionStore((state) => state.openSections[id] ?? defaultOpen);
  const setSectionsOpen = useSectionStore((state) => state.setSectionsOpen);
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const digestId = `${baseId}-digest`;

  return (
    <details
      // Predictable from the section id, because `SectionToggleAll` has to name this region in
      // `aria-controls` and recognise it as the one holding the focus it is about to hide.
      id={sectionElementId(id)}
      open={isOpen}
      onToggle={(event) => {
        setSectionsOpen([id], event.currentTarget.open);
      }}
      // The last group's own bottom padding would otherwise stack on the panel's, leaving far more
      // air under the final field than there is above the panel heading.
      className="border-t border-foundry-700/70 first:border-t-0 last:[&>fieldset]:pb-0"
    >
      {/*
        A two-column grid, not a row: the caret and the heading share the first row, and the digest
        takes the second cell of the second column so it starts under the heading rather than under
        the caret. `list-none` kills the marker in Firefox and Chromium; the WebKit pseudo-element is
        its own rule, and without it Safari draws a second triangle beside the caret.
      */}
      <summary
        aria-labelledby={headingId}
        aria-describedby={isOpen ? undefined : digestId}
        className="grid cursor-pointer list-none grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 rounded-lg py-3 transition-colors duration-200 hover:bg-foundry-700/40 [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`size-3.5 shrink-0 text-tab transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
        </svg>

        {/*
          `text-xs` — the body rung, the same one the field labels below take — because this heading
          has to outrank them, and at `text-2xs` (the eyebrow rung the old `FieldGroup` legend used)
          it was *smaller* than the labels it heads while sharing their colour. It carries the rank
          in the other three dimensions instead: bold against semibold, `ink` against `ink-muted`,
          and uppercase with tracking against neither.

          **The trailing rule separates one group from the next**, which is the thing those four
          dimensions do not do — they rank a heading against the fields *under* it. That job was left
          to the `foundry-700/70` border atop each `<details>`, which sits a full `py-3` away and
          reads, in a column of six, as one more hairline in a form full of them. This puts the
          boundary on the heading itself, and its ragged left edge tracks the heading length, so
          consecutive groups differ in outline and not only in wording.

          `bg-tab`, because it belongs to the view — the caret beside it already takes that stop, so
          the two read as one piece of section furniture. The quarter alpha is the whole of the
          subtlety: a dimmer colour would be a value written at the call site, and the token is a
          *light* one on a dark ground.

          An `::after` rather than an element. `<summary>` takes phrasing content intermixed with
          heading content, so a `<div>` wrapper would leave that model, and anything real inside the
          heading would have to be kept out of the accessible name `aria-labelledby` computes from
          it; empty generated content is in neither the DOM nor the name. Being decorative is also
          why it is left to vanish under `forced-colors`, where backgrounds are repainted — the
          heading, the disclosure semantics and the section border all survive without it.

          `gap-2` matches the grid's own caret-to-heading gap, and those 8px are the only width this
          costs the heading — unavoidably, not by choice: the rule is `flex-1` from a zero basis, so
          its scaled shrink factor is zero and every pixel of shortfall falls on the text, and a
          margin or a border in its place would not shrink either. So the wrap point moves by exactly
          the gap and nothing else; below about 335px the rule is 0px wide and simply is not drawn.
        */}
        <h3
          id={headingId}
          className="flex items-center gap-2 text-xs font-bold tracking-wide text-ink uppercase after:h-px after:flex-1 after:bg-tab/25 after:content-['']"
        >
          {heading}
        </h3>

        {!isOpen && (
          /*
            No clamp. A clamp would put the sighted reader behind the screen-reader one — the
            description carries the whole string either way — and "folding must never hide the
            configuration" is the entire argument for folding. It can wrap because it does not have
            to fight the heading for room, and because `studioDigests` bounds every value before it
            gets here, so the worst case is a few lines rather than a pasted paragraph.

            `text-ink-muted`, not `ink-faint`: this is the *only* copy of a folded group's settings,
            and `glass-panel`'s top-edge wash takes the faint tone marginally under 4.5:1 on the
            first group of a panel.
          */
          <span
            id={digestId}
            className="col-start-2 min-w-0 font-mono text-2xs leading-relaxed text-ink-muted"
          >
            {digest}
          </span>
        )}
      </summary>

      {/*
        A `<fieldset>`, labelled by the heading above it. The `<legend>` the old `FieldGroup` used is
        gone — it cannot live inside a `<summary>`, and a heading is what screen-reader navigation
        actually needs — but a group of form controls should still *say* what group it belongs to,
        or forms mode announces "Palette Limit, combo box" with nothing tying it to Render style.
        `aria-labelledby` recovers exactly that without a second visible label.

        `min-w-0` because a fieldset's `min-inline-size: min-content` is a user-agent default that
        Tailwind's preflight does not reset, and it would stop the grid inside from shrinking.
      */}
      <fieldset aria-labelledby={headingId} className="min-w-0 space-y-3.5 pt-1 pb-4">
        {children}
      </fieldset>
    </details>
  );
}
