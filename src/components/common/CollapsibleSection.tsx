import { useId } from 'react';
import type { ReactNode } from 'react';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import type { SectionDefinition } from '../../types/ui.ts';

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
 * button" — six identifiers in front of the state a user is listening for. `aria-hidden` takes it
 * out of the name and `aria-describedby` puts it back as the description, which is the one place
 * `aria-hidden` content is still read: the name computation for a referenced node ignores whether
 * the node is hidden. Sighted and screen-reader users get the same two pieces of information, in the
 * same order.
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

        <h3 id={headingId} className="text-xs font-bold tracking-wide text-ink uppercase">
          {heading}
        </h3>

        {!isOpen && (
          <span
            id={digestId}
            aria-hidden="true"
            className="col-start-2 min-w-0 line-clamp-2 font-mono text-[10px] leading-relaxed text-ink-faint"
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
