import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import { CollapsibleSection } from './CollapsibleSection.tsx';

/**
 * The disclosure's contract, which is mostly about what a *folded* group still says.
 *
 * Folding hides the controls; it must never hide the configuration, because every field inside one
 * of these reaches the compiled prompt whether the group is open or shut. The digest is what makes
 * that true, so the tests that matter here are the ones about when it is on screen.
 */
const SECTION = { id: 'test:group', defaultOpen: true } as const;

function renderSection(open = true) {
  return render(
    <CollapsibleSection
      id={SECTION.id}
      defaultOpen={open}
      heading="Render style"
      digest="PIXEL_ART · HIGH_RESOLUTION"
    >
      <label htmlFor="inner">
        Inner field
        <input id="inner" type="text" defaultValue="" />
      </label>
    </CollapsibleSection>,
  );
}

beforeEach(() => {
  useSectionStore.setState({ openSections: {} });
});

describe('CollapsibleSection', () => {
  it('heads the group with a real heading, so screen readers can navigate to it', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: 'Render style', level: 3 })).toBeInTheDocument();
  });

  it('shows the digest only while folded', () => {
    renderSection(false);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();

    renderSection(true);
    // Two sections are mounted now; the open one must not have added a second digest.
    expect(screen.getAllByText('PIXEL_ART · HIGH_RESOLUTION')).toHaveLength(1);
  });

  it('opens and closes from the summary, and records it in the store', async () => {
    const user = userEvent.setup();
    renderSection(false);

    await user.click(screen.getByRole('heading', { name: 'Render style' }));
    expect(useSectionStore.getState().openSections[SECTION.id]).toBe(true);
    expect(screen.queryByText('PIXEL_ART · HIGH_RESOLUTION')).not.toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Render style' }));
    expect(useSectionStore.getState().openSections[SECTION.id]).toBe(false);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();
  });

  it('takes its state from the store over its own default', () => {
    useSectionStore.setState({ openSections: { [SECTION.id]: false } });
    renderSection(true);
    expect(screen.getByText('PIXEL_ART · HIGH_RESOLUTION')).toBeInTheDocument();
  });

  it('puts nothing interactive inside the summary — the summary is the control', () => {
    renderSection(true);
    const summary = document.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.querySelector('button, a, input, select, textarea')).toBeNull();
  });

  it('names itself from the heading alone, and offers the values as a description', () => {
    renderSection(false);
    const summary = document.querySelector('summary');
    const named = document.getElementById(summary?.getAttribute('aria-labelledby') ?? '');
    const described = document.getElementById(summary?.getAttribute('aria-describedby') ?? '');
    expect(named?.textContent).toBe('Render style');
    expect(described?.textContent).toBe('PIXEL_ART · HIGH_RESOLUTION');
    // Not `aria-hidden`: a description is read once at the reader's verbosity and can never be
    // re-read, so the values stay ordinary text a virtual cursor can go back over.
    expect(described).not.toHaveAttribute('aria-hidden');
  });

  it('drops the description when open — the controls label themselves', () => {
    renderSection(true);
    expect(document.querySelector('summary')).not.toHaveAttribute('aria-describedby');
  });

  /**
   * `section-reveal` animates the close by keeping the content painted past the moment `open` goes,
   * so for the length of that transition a shut group is still tabbable. When the paint stops, the
   * user agent has nowhere to put any focus inside it and drops it to `<body>` — the position and
   * the ring both lost, which is precisely what `SectionToggleAll` moves focus to avoid.
   *
   * Simulated rather than driven: happy-dom implements neither `::details-content` nor transitions,
   * so the browser's own blur cannot happen here. What *is* testable is the component's half of the
   * contract — that a `focusout` going nowhere, from a group that is already shut, is recovered.
   */
  it('recovers focus the collapse throws away, rather than leaving it on the document', () => {
    renderSection(false);
    const summary = document.querySelector('summary');
    const details = document.querySelector('details');
    expect(summary).not.toBeNull();
    expect(details?.open).toBe(false);

    // `relatedTarget: null` is the browser saying focus went nowhere, which is what it does when the
    // element holding it stops being rendered.
    details?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

    expect(document.activeElement).toBe(summary);
  });

  /**
   * `section-reveal` transitions to a pixel height, because that is the only target both Firefox and
   * Chromium interpolate — so something has to supply the pixels, and it is this component.
   *
   * happy-dom lays nothing out, so every element measures zero and the observer correctly publishes
   * nothing. What is testable here is the half that is not layout: that the component observes its
   * own content at all, and that a zero measurement is *discarded* rather than written — because a
   * published zero is what would make the next expand animate from nothing to nothing.
   */
  it('watches its own content so the reveal has a height to animate towards', () => {
    const observed: Element[] = [];
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        observed.push(target);
        this.callback([], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      renderSection(true);
      // The content itself, not the summary or the disclosure — the fieldset is what has the height.
      expect(observed.map((el) => el.tagName)).toEqual(['FIELDSET']);
      // happy-dom measures 0, and 0 must never be published: a shut group reports exactly that, and
      // overwriting the last real figure with it would leave the next expand nothing to travel to.
      expect(document.querySelector('details')?.style.getPropertyValue('--section-content-block-size')).toBe(
        '',
      );
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  it('leaves focus alone while the group is still open — that blur is not a collapse', () => {
    // Without this guard, any click into empty space would yank focus back to the summary of
    // whichever group the user happened to be typing in.
    renderSection(true);
    const inner = screen.getByLabelText('Inner field');
    inner.focus();

    document
      .querySelector('details')
      ?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

    expect(document.activeElement).toBe(inner);
  });

  it('leaves focus alone when it landed somewhere real, even from a shut group', () => {
    // The other guard: an ordinary Tab out of a group carries a `relatedTarget`, and hijacking that
    // would drag the user backwards on every one. The stand-in for "somewhere else" is a node
    // already on the page — one appended here would outlive Testing Library's cleanup and turn up
    // in the next test's `getByRole` query, which is how this suite first went red.
    renderSection(false);
    const details = document.querySelector('details');
    const summary = document.querySelector('summary');
    expect(details?.open).toBe(false);
    expect(summary).not.toBeNull();

    const heading = screen.getByRole('heading', { name: 'Render style' });
    details?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: heading }));

    expect(document.activeElement).not.toBe(summary);
  });
});
