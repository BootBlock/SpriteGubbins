import { APP_TAB_CHOICES } from '../../constants/ui.ts';
import { PRESETS } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';

/**
 * Moving between the four views.
 *
 * A `<nav>` of buttons marked with `aria-current`, not an ARIA tablist. These swap the whole main
 * region rather than revealing panels that all exist at once, so navigation is what they actually
 * are — and claiming otherwise would promise assistive technology a tabpanel relationship the page
 * does not have.
 */
export function TabSwitcher() {
  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  // A count, not the array: this must not re-render when a preset's *contents* change.
  const customPresetCount = usePresetStore((state) => state.customPresets.length);

  return (
    <nav
      aria-label="Views"
      className="flex items-center gap-1 rounded-xl border border-foundry-700 bg-foundry-950/60 p-1 shadow-inner backdrop-blur-md"
    >
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
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-b from-accent to-accent-strong text-ink shadow-lg ring-1 ring-accent-soft/50'
                : 'text-ink-faint hover:bg-foundry-700 hover:text-ink'
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
            {tab.id === 'presets' && (
              <span className="font-mono">({PRESETS.length + customPresetCount})</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
