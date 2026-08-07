import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Badge } from '../common/Badge.tsx';
import { TabSwitcher } from './TabSwitcher.tsx';

/**
 * The app's chrome: identity, navigation, and the two things worth reaching from anywhere — the
 * atlas calculator and the prompt itself.
 *
 * Sticky, because "Copy Prompt" has to be available at the bottom of a sixteen-field form as well as
 * the top. Nothing here subscribes to the subject or output state; the copy action reads it when
 * pressed, so a keystroke in the form does not re-render the header.
 */
export function Header() {
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const toggleHistoryModal = useUIStore((state) => state.toggleHistoryModal);
  const copyPrompt = useCopyPrompt();

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-foundry-700 bg-foundry-950/80 px-6 py-4 shadow-2xl backdrop-blur-xl">
      <button
        type="button"
        onClick={() => {
          setActiveTab('studio');
        }}
        className="group flex items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-xl bg-accent-strong text-xl shadow-lg transition-transform duration-300 group-hover:scale-105"
        >
          👾
        </span>
        <span>
          <span className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
            Sprite Gubbins
            <Badge tone="accent">Serverless</Badge>
          </span>
          <span className="block text-[11px] text-ink-faint">Modular sprite-sheet prompt architecture</span>
        </span>
      </button>

      <TabSwitcher />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAtlasModal}
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-800 px-3 py-2 text-xs font-bold text-accent-soft shadow-md transition-colors hover:border-accent/50 hover:bg-foundry-700"
        >
          <span aria-hidden="true">📊</span>
          Atlas Calc
        </button>

        <button
          type="button"
          onClick={toggleHistoryModal}
          className="flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-800 px-3 py-2 text-xs font-bold text-ink-muted shadow-md transition-colors hover:bg-foundry-700"
        >
          <span aria-hidden="true">🕓</span>
          History
        </button>

        <button
          type="button"
          onClick={() => {
            void copyPrompt();
          }}
          className="flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-xs font-extrabold text-ink shadow-lg transition-all hover:scale-[1.02] hover:bg-accent active:scale-[0.98]"
        >
          <span aria-hidden="true">📋</span>
          Copy Prompt
        </button>
      </div>
    </header>
  );
}
