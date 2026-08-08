import { create } from 'zustand';

/**
 * Which collapsible sections are open.
 *
 * A store rather than component state because the views unmount: `App` renders only
 * `VIEWS[activeTab]`, so a `useState` inside a panel would silently re-fold everything the moment
 * the user glanced at the Quantise tab and came back.
 *
 * **Only deviations are recorded.** A section absent from the record is at whatever its call site
 * declared as its default, so the initial state is genuinely empty and no list of section ids has to
 * be kept in sync here. That is also why there is no `toggle(id)` action — a toggle would have to
 * know the default to flip an unrecorded section correctly, and the call site is the only place that
 * knows it. It reads its own state and writes the answer.
 *
 * Session-lived on purpose. Persisting this would mean a storage surface beside the SQLite/OPFS
 * layer for a preference nobody asked for; surviving a tab switch is the part that matters.
 */
export interface SectionState {
  /** Section id → open, for the sections the user has moved off their default. */
  readonly openSections: Readonly<Record<string, boolean>>;
  /** Open or close every named section at once. One `set` — a per-id loop would render per id. */
  setSectionsOpen(ids: readonly string[], open: boolean): void;
}

export const useSectionStore = create<SectionState>((set) => ({
  openSections: {},

  setSectionsOpen: (ids, open) => {
    set((state) => ({
      openSections: { ...state.openSections, ...Object.fromEntries(ids.map((id) => [id, open])) },
    }));
  },
}));
