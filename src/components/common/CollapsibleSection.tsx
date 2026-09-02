import { useEffect, useId, useRef } from 'react';
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
 * **It eases open and shut** — `section-reveal`, defined in `index.css` as every `@utility` in this
 * app is, and applied here as an ordinary class. The caret's rotation shares its 585ms, so the
 * chevron and the group are one gesture rather than two things of different lengths.
 *
 * This carried a "deliberately not animated" note for a while, and the objection it recorded was
 * real: the height transition needs the content clipped, and a clipping ancestor around these
 * fields would slice the combo box's suggestion list in half on a browser taking
 * `useAnchoredSurface`'s un-lifted fallback. What answers it is not a better clip but a gate — the
 * transition sits behind `@supports … and selector(:popover-open)`, so the clip exists only where
 * that list is lifted into the top layer and cannot be clipped by anything. A browser without the
 * lift gets the instant open it always had.
 *
 * **What animating the close costs is a focus hazard, and the `onBlur` below is what pays it.**
 * Holding the content painted past the moment `open` goes is the only way to have a box left to
 * shrink, and for those 585ms a shut group is still tabbable; the handler catches the focus the user
 * agent then throws to `<body>` and puts it back on the summary. The rejected alternative, `inert`,
 * is recorded in `section-reveal` — it prevents the entry and costs find-in-page, which is one of
 * the reasons this component is a `<details>` at all.
 *
 * The other half of the old note still stands, and is why the motion is a *transition* and not a
 * keyframe: measured in Edge and in Chromium, a keyframe animation on a child of a `<details>`
 * fires `animationstart` exactly once and still reports a finished animation while the group is
 * shut, so closing and reopening plays nothing. Rendering state in a `content-visibility: hidden`
 * subtree is preserved, not reset. A transition on the pseudo-element has no such memory — it runs
 * from whatever the current computed value is, every time.
 *
 * `SheetSplitRun`'s bare `<details>` is deliberately **not** converted to this. It folds one run's
 * prompt text inside a modal list: it has no configuration to digest, and its open state is per-run
 * scratch that has no business outliving the modal in a global store. Widening this component to
 * cover it would mean optional ids and optional digests — speculative generality for one call site.
 * It does not take `section-reveal` either, which is a separate decision now that the motion is a
 * class rather than part of this component: eight runs each folding a wall of prompt text is a list,
 * and a list that reflows on every disclosure is harder to read, not more dynamic. The modal's own
 * entrance is the motion there.
 */
export function CollapsibleSection({ id, defaultOpen, heading, digest, children }: CollapsibleSectionProps) {
  const isOpen = useSectionStore((state) => state.openSections[id] ?? defaultOpen);
  const setSectionsOpen = useSectionStore((state) => state.setSectionsOpen);
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const digestId = `${baseId}-digest`;
  const contentRef = useRef<HTMLFieldSetElement>(null);

  /*
    Publishing the content's height, because `section-reveal` transitions to a pixel length and only
    what renders the content can know it — that utility explains why `auto` is not an option.

    A `ResizeObserver` rather than one measurement on toggle: the height is not a constant. A label
    wraps, the category swaps one field set for another, the window resizes — and a stale number
    would animate the group to the wrong height and jump at the end.

    **Zero is discarded rather than published.** A shut group sits in a `content-visibility: hidden`
    subtree, so it is not laid out and the observer reports nothing; keeping the last real figure is
    exactly what gives the *next* expand something to travel towards. The variable is therefore only
    ever wrong in one direction — stale, never zero — and is corrected on the first frame the content
    is laid out again.

    Written to the DOM rather than to React state on purpose: this changes on every frame of a window
    resize, and routing it through a store or a `useState` would re-render every section in the
    studio for a number only CSS reads.
  */
  useEffect(() => {
    const content = contentRef.current;
    const details = content?.closest('details');
    if (!content || !details) return;

    const observer = new ResizeObserver(() => {
      const height = content.getBoundingClientRect().height;
      if (height > 0) details.style.setProperty('--section-content-block-size', `${height}px`);
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <details
      // Predictable from the section id, because `SectionToggleAll` has to name this region in
      // `aria-controls` and recognise it as the one holding the focus it is about to hide.
      id={sectionElementId(id)}
      open={isOpen}
      onToggle={(event) => {
        setSectionsOpen([id], event.currentTarget.open);
      }}
      /*
        Catching the focus the collapse throws away.

        `section-reveal` keeps `::details-content` painted for the length of the transition, which is
        the only way the close can animate at all — and for those 585ms the group is shut while its
        controls are still reachable, so Enter-then-Tab on the summary lands inside a closed group.
        When the paint stops, the user agent has nowhere to put that focus and drops it to `<body>`:
        the ring gone, the position gone, exactly what `SectionToggleAll` moves focus to avoid.

        `onBlur` is React's name for `focusout`, which bubbles — so this hears the blur wherever
        inside the group it came from. The two guards are what keep it from firing on anything else:
        a `relatedTarget` of `null` means focus went nowhere rather than on to another control, and
        an already-closed `<details>` means this is the collapse rather than a click on empty page.
        Landing on the summary rather than the next group is deliberate — it is the control that
        reopens what just shut, and it is where the user was a moment ago.
      */
      onBlur={(event) => {
        if (event.currentTarget.open || event.relatedTarget !== null) return;
        event.currentTarget.querySelector('summary')?.focus();
      }}
      // The last group's own bottom padding would otherwise stack on the panel's, leaving far more
      // air under the final field than there is above the panel heading. Trimmed to the single step
      // the class below states rather than removed: `section-reveal` clips the block axis of
      // `::details-content`, and clipping happens at the padding edge — so a final control sitting
      // flush against it loses the bottom stroke of its focus ring, which is drawn 4px outside its
      // box. Those 4px are the clearance, and they are 12px less air than the `pb-4` this is
      // trimming.
      className="section-reveal border-t border-foundry-700/70 first:border-t-0 last:[&>fieldset]:pb-1"
    >
      {/*
        A two-column grid, not a row: the caret and the heading share the first row, and the digest
        takes the second cell of the second column so it starts under the heading rather than under
        the caret. `list-none` kills the marker in Firefox and Chromium; the WebKit pseudo-element is
        its own rule, and without it Safari draws a second triangle beside the caret.

        **This is one of the app's two controls that carries no guidance card, and the markup is
        why.** A `<summary>` has to be the first child of its `<details>`, so there is nowhere to put
        a wrapper that would not stop it being the disclosure's control — and it is already spoken
        for twice over, naming itself through `aria-labelledby` and describing itself with the
        digest, which is the configuration a fold must never hide. What it does is also said by the
        heading it carries and by the caret beside it, and every field inside keeps its own ⓘ.
      */}
      <summary
        aria-labelledby={headingId}
        aria-describedby={isOpen ? undefined : digestId}
        className="grid cursor-pointer list-none grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 rounded-lg py-3 transition-colors duration-390 hover:bg-foundry-700/40 [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          // `ease-decelerate` is stated here because the height it turns with states it too — see
          // the `::details-content` rule in `index.css`, which runs `block-size` on that curve for
          // this same 585ms. The layer's default is `ease-emphasized`, which is 83% travelled in its
          // first quarter and is the curve that rule rejects by name for this gesture, so a caret
          // that said nothing would take it and the two halves would part company mid-turn.
          className={`size-3.5 shrink-0 text-tab transition-transform duration-585 ease-decelerate ${isOpen ? 'rotate-90' : ''}`}
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
      <fieldset ref={contentRef} aria-labelledby={headingId} className="min-w-0 space-y-3.5 pt-1 pb-4">
        {children}
      </fieldset>
    </details>
  );
}
