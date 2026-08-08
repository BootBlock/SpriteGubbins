import { APP_TAB_CHOICES } from '../../constants/ui.ts';
import { PRESETS } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';

/**
 * Equal-width columns, one per view.
 *
 * This is what makes the indicator's geometry knowable without measuring anything: every slot is
 * exactly `1 / n` of the switcher's padding box, so the selected one is `index × 100%` along. A
 * content-width row of buttons would need each button's real width read back out of the DOM after
 * layout, which is a `useLayoutEffect` writing state on every render — the state-mirroring shape the
 * structural laws ban, in exchange for nothing the user can see.
 *
 * `minmax(0, 1fr)` rather than `1fr`: identical while the tracks are wide enough, but it lets a
 * label narrower than its own minimum content size shrink instead of forcing the switcher wider.
 *
 * The switcher's `gap-0` is load-bearing for the same reason, and is written out rather than left
 * to the default: a column gap would put space between the slots that the pill's `1 / n` does not
 * know about, and the selection would drift further from its label with every tab along the row.
 */
const COLUMN_TEMPLATE = `repeat(${APP_TAB_CHOICES.length}, minmax(0, 1fr))`;
const SLOT_WIDTH = `${100 / APP_TAB_CHOICES.length}%`;

/**
 * Moving between the four views.
 *
 * A `<nav>` of buttons marked with `aria-current`, not an ARIA tablist. These swap the whole main
 * region rather than revealing panels that all exist at once, so navigation is what they actually
 * are — and claiming otherwise would promise assistive technology a tabpanel relationship the page
 * does not have.
 *
 * The selection is **one pill that slides**, rather than a background switched on the button that
 * won and off the one that lost. Two independent fades cannot express travel — the eye is told
 * something new lit up, not that the same thing moved — so the pill is a single element outside the
 * buttons, translated to the active slot along the app's signature decelerating curve. A user who
 * has asked their OS for less motion gets the same pill, arriving instantly, from the catch-all at
 * the bottom of `index.css`.
 */
export function TabSwitcher() {
  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  // A count, not the array: this must not re-render when a preset's *contents* change.
  const customPresetCount = usePresetStore((state) => state.customPresets.length);

  const activeIndex = APP_TAB_CHOICES.findIndex((tab) => tab.id === activeTab);

  return (
    <nav
      aria-label="Views"
      style={{ gridTemplateColumns: COLUMN_TEMPLATE }}
      className="relative grid gap-0 rounded-xl border border-foundry-700 bg-foundry-950/60 p-1 shadow-inner backdrop-blur-md"
    >
      {/*
        The travelling selection, inset to the switcher's own padding so it lines up with the
        columns exactly. Rendered only once a view actually matches — an indicator parked off the
        left edge would be a worse answer to "this tab isn't in the list" than no indicator at all.
      */}
      {activeIndex >= 0 && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-1 right-1 left-1">
          <span
            style={{ width: SLOT_WIDTH, transform: `translateX(${activeIndex * 100}%)` }}
            className="ease-emphasized block h-full rounded-lg bg-gradient-to-b from-accent to-accent-strong shadow-lg ring-1 ring-accent-soft/50 transition-transform duration-500"
          />
        </span>
      )}

      {APP_TAB_CHOICES.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              setActiveTab(tab.id);
            }}
            // `relative` puts the label above the pill: the pill is positioned and these are not,
            // so without it every label would be painted underneath the thing selecting it.
            className={`group relative flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition-colors duration-200 sm:px-4 ${
              isActive ? 'text-ink' : 'text-ink-faint hover:bg-foundry-700/60 hover:text-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block transition-transform duration-300 group-hover:scale-125 ${
                isActive ? 'scale-110' : ''
              }`}
            >
              {tab.icon}
            </span>
            {/*
              Four labels cannot fit four equal columns on a phone — "Architecture" alone is most of
              one — so below `sm` the switcher is its glyphs, and the wording goes screen-reader-only
              rather than away. The accessible name is the same at every width; only what is painted
              changes, which is what keeps this a rendering decision rather than an accessibility one.
            */}
            <span className="sr-only gap-2 sm:not-sr-only sm:flex sm:items-center">
              {tab.label}
              {tab.id === 'presets' && (
                <span className="font-mono">({PRESETS.length + customPresetCount})</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
