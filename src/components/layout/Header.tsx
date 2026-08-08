import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Badge } from '../common/Badge.tsx';
import { TabSwitcher } from './TabSwitcher.tsx';

/**
 * Shared geometry and motion for the two secondary chrome actions, so they stay a matched pair.
 *
 * The hover border is the view's colour rather than the primary: these two sit in the chrome above
 * whichever view is showing, and picking it up on hover is what stops the header reading as a
 * separate application bolted over the page.
 */
const CHROME_ACTION =
  'group flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-800/70 px-3 py-2 text-xs font-bold shadow-md transition-all duration-200 hover:-translate-y-px hover:border-tab/60 hover:bg-foundry-700 hover:shadow-lg active:translate-y-0 active:shadow-md';

/** …and the matching lift for the glyph inside one, which is why both are `group`s. */
const CHROME_ACTION_ICON = 'inline-block transition-transform duration-300 group-hover:scale-125';

/**
 * The app's chrome: identity, navigation, and the two things worth reaching from anywhere — the
 * atlas calculator and the prompt itself.
 *
 * Sticky, because "Copy Prompt" has to be available at the bottom of a sixteen-field form as well as
 * the top. Nothing here subscribes to the subject or output state; the copy action reads it when
 * pressed, so a keystroke in the form does not re-render the header.
 *
 * Glass rather than a solid bar: the aurora and the dot grid keep moving behind it as the page
 * scrolls, which is what stops a sticky header reading as a lid clamped over the document. The
 * hairline under it is a gradient rather than a flat rule, so the bar dissolves into the page at its
 * edges instead of ending in two hard corners.
 */
export function Header() {
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const toggleHistoryModal = useUIStore((state) => state.toggleHistoryModal);
  const copyPrompt = useCopyPrompt();

  return (
    <header className="glass-panel sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-4 shadow-2xl">
      {/*
        The rule under the bar is the whole wheel, turning. It is the app's signature and the one
        surface that shows the palette entire rather than the slice belonging to the current view —
        which is why it is here, on the chrome every view shares, and nowhere else.
      */}
      <span
        aria-hidden="true"
        className="animate-spectrum-pan bg-spectrum pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-80"
      />

      <button
        type="button"
        onClick={() => {
          setActiveTab('studio');
        }}
        className="group flex items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className="animate-spectrum-pan bg-spectrum flex size-10 items-center justify-center rounded-xl text-xl shadow-lg ring-1 ring-accent-soft/40 transition-all duration-300 group-hover:scale-105 group-hover:rotate-6 group-hover:ring-accent-soft"
        >
          👾
        </span>
        <span>
          <span className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="heading-spectrum animate-spectrum-pan">Sprite Gubbins</span>
            <Badge tone="accent">Serverless</Badge>
          </span>
          <span className="block text-xs text-ink-faint transition-colors group-hover:text-ink-muted">
            Modular sprite-sheet prompt architecture
          </span>
        </span>
      </button>

      <TabSwitcher />

      <div className="flex items-center gap-2">
        <button type="button" onClick={toggleAtlasModal} className={`${CHROME_ACTION} text-accent-soft`}>
          <span aria-hidden="true" className={CHROME_ACTION_ICON}>
            📊
          </span>
          Atlas Calc
        </button>

        <button type="button" onClick={toggleHistoryModal} className={`${CHROME_ACTION} text-ink-muted`}>
          {/* The one glyph that turns rather than grows — it is a clock, and this is history. */}
          <span aria-hidden="true" className={`${CHROME_ACTION_ICON} group-hover:-rotate-45`}>
            🕓
          </span>
          History
        </button>

        {/*
          The primary action, and the only control in the chrome that glows. The sheen is a child
          rather than a background layer on the button itself, so it can be clipped to the rounded
          corners and slid across on hover without disturbing the gradient underneath.
        */}
        <button
          type="button"
          onClick={() => {
            void copyPrompt();
          }}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-strong to-accent px-4 py-2 text-xs font-extrabold text-ink shadow-lg ring-1 ring-accent-soft/40 transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl hover:ring-accent-soft active:scale-[0.98]"
        >
          <span
            aria-hidden="true"
            className="shimmer-surface absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative flex items-center gap-2">
            <span aria-hidden="true">📋</span>
            Copy Prompt
          </span>
        </button>
      </div>
    </header>
  );
}
