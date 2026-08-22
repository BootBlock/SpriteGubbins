import { useLayoutEffect, useRef } from 'react';
import { CHROME_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TabSwitcher } from './TabSwitcher.tsx';
import { Wordmark } from './Wordmark.tsx';

/**
 * Shared geometry and motion for the two secondary chrome actions, so they stay a matched pair.
 *
 * The hover border is the view's colour rather than the primary: these two sit in the chrome above
 * whichever view is showing, and picking it up on hover is what stops the header reading as a
 * separate application bolted over the page.
 */
const CHROME_ACTION =
  'group flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-800/70 px-3 py-2 text-xs font-bold shadow-md transition-all duration-390 hover:-translate-y-px hover:border-tab/60 hover:bg-foundry-700 hover:shadow-lg active:translate-y-0 active:shadow-md';

/** …and the matching lift for the glyph inside one, which is why both are `group`s. */
const CHROME_ACTION_ICON = 'inline-block transition-transform duration-585 group-hover:scale-125';

/** The wheel along the bar's bottom edge — one string, so the bloom and the hairline cannot drift. */
const SPECTRUM_EDGE = 'animate-spectrum-pan bg-spectrum pointer-events-none absolute inset-x-0';

/**
 * The app's chrome: identity, navigation, and the three things worth reaching from anywhere — the
 * source, the atlas calculator, and the prompt itself.
 *
 * Sticky, because "Copy Prompt" has to be available at the bottom of a sixteen-field form as well as
 * the top. Nothing here subscribes to the subject or output state; the copy action reads it when
 * pressed, so a keystroke in the form does not re-render the header.
 *
 * Glass rather than a solid bar: the aurora and the dot grid keep moving behind it as the page
 * scrolls, which is what stops a sticky header reading as a lid clamped over the document.
 */
export function Header() {
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const toggleHistoryModal = useUIStore((state) => state.toggleHistoryModal);
  const toggleSettingsModal = useUIStore((state) => state.toggleSettingsModal);
  const copyPrompt = useCopyPrompt();
  const bar = useRef<HTMLElement>(null);

  // Publish the bar's height for `scroll-padding-top`, which holds that much space open at the top
  // of every scroll so a Tab landing below the fold does not put its focus ring underneath this.
  // Measured rather than written into the stylesheet as a number, because the bar wraps: on a narrow
  // viewport it is genuinely two or three rows tall, so no single figure is right everywhere, and
  // one written down would rot the first time its padding or type size moved. The observer covers
  // both — the wrap, and the change nobody remembered to update a constant for.
  useLayoutEffect(() => {
    const element = bar.current;
    if (element === null) return;

    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${String(element.offsetHeight)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      // The property outlives this component otherwise, leaving the page reserving room for a bar
      // that is no longer there.
      document.documentElement.style.removeProperty('--header-height');
    };
  }, []);

  return (
    <header
      ref={bar}
      className="glass-panel sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-4 shadow-2xl"
    >
      {/*
        The rule under the bar is the whole wheel, turning — the app's signature, and the one
        surface showing the palette entire rather than the slice belonging to the current view,
        which is why it is here on the chrome every view shares and nowhere else.

        Two layers: a blurred bloom straddling the bar's bottom edge, half over the glass and half
        over the page, and the crisp hairline over it. A 1px line changing hue across half a minute
        is a change nobody catches sight of; light spilling below the bar is noticed regardless.
      */}
      <span aria-hidden="true" className={`${SPECTRUM_EDGE} -bottom-0.5 h-1 opacity-50 blur-xs`} />
      <span aria-hidden="true" className={`${SPECTRUM_EDGE} bottom-0 h-px opacity-80`} />

      <Wordmark />

      <TabSwitcher />

      <div className="flex items-center gap-2">
        <ControlTooltip hint="Atlas Calc" text={CHROME_TOOLTIPS.atlasCalculator}>
          <button type="button" onClick={toggleAtlasModal} className={`${CHROME_ACTION} text-accent-soft`}>
            <span aria-hidden="true" className={CHROME_ACTION_ICON}>
              📊
            </span>
            Atlas Calc
          </button>
        </ControlTooltip>

        <ControlTooltip hint="History" text={CHROME_TOOLTIPS.history}>
          <button type="button" onClick={toggleHistoryModal} className={`${CHROME_ACTION} text-ink-muted`}>
            {/* The one glyph that turns rather than grows — it is a clock, and this is history. */}
            <span aria-hidden="true" className={`${CHROME_ACTION_ICON} group-hover:-rotate-45`}>
              🕓
            </span>
            History
          </button>
        </ControlTooltip>

        {/*
          The primary action, and the only control in the chrome that glows. The sheen is a child
          rather than a background layer on the button itself, so it can be clipped to the rounded
          corners and slid across on hover without disturbing the gradient underneath.
        */}
        <ControlTooltip hint="Copy Prompt" text={CHROME_TOOLTIPS.copyPrompt}>
          <button
            type="button"
            onClick={() => {
              void copyPrompt();
            }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-strong to-accent px-4 py-2 text-xs font-extrabold text-foundry-950 shadow-lg ring-1 ring-accent-soft/40 transition-all duration-390 hover:scale-[1.03] hover:shadow-2xl hover:ring-accent-soft active:scale-[0.98]"
          >
            <span
              aria-hidden="true"
              className="shimmer-surface absolute inset-0 -translate-x-full transition-transform duration-1365 group-hover:translate-x-full"
            />
            <span className="relative flex items-center gap-2">
              <span aria-hidden="true">📋</span>
              Copy Prompt
            </span>
          </button>
        </ControlTooltip>

        {/*
          The far right of the bar, past the primary, which is where a settings control has been for
          long enough that anywhere else costs the user a search. It is the only chrome action with no
          word beside its glyph — a cog is the one icon in this header that needs none, and giving it
          a label would put a fourth piece of text in a row that already wraps on a phone. That makes
          `aria-label` load-bearing rather than decorative, so the glyph is hidden and the button
          carries the name itself.

          It takes the shared geometry unaltered rather than tightening the padding for its one glyph.
          Two Tailwind paddings on one element do not resolve by the order they are written in the
          string — they resolve by the order the utilities land in the generated stylesheet, which is
          not something a call site can see — so an override here would be a coin toss that renders
          correctly about half the time. The cog also turns as it grows, which the history clock is the
          precedent for: a rotation is what these two glyphs mean, where a magnifier or a clipboard
          would only look restless.
        */}
        <ControlTooltip hint="Settings" text={CHROME_TOOLTIPS.settings}>
          <button
            type="button"
            onClick={toggleSettingsModal}
            aria-label="Settings"
            className={`${CHROME_ACTION} text-ink-muted`}
          >
            <span aria-hidden="true" className={`${CHROME_ACTION_ICON} group-hover:rotate-90`}>
              ⚙️
            </span>
          </button>
        </ControlTooltip>
      </div>
    </header>
  );
}
