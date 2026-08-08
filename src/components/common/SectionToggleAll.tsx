import { useSectionStore } from '../../stores/useSectionStore.ts';
import type { SectionDefinition } from '../../types/ui.ts';

interface SectionToggleAllProps {
  readonly sections: readonly SectionDefinition[];
  /** The panel these sections belong to, for an accessible name that says *which* "all". */
  readonly panelLabel: string;
}

/**
 * Open or shut every group in one panel.
 *
 * Nielsen Norman's accordion guidance asks for this outright, and the arithmetic backs it: with
 * three of `OutputConfig`'s five groups folded by default, a user who wants to see everything is
 * otherwise clicking five headers.
 *
 * It lives in the panel header rather than beside the groups because nothing interactive may sit
 * inside a `<summary>` — the summary is itself the control.
 *
 * The label states what the button will *do*, not what it currently is, and flips only when every
 * group is open: from a half-folded panel the useful move is to finish opening it.
 */
export function SectionToggleAll({ sections, panelLabel }: SectionToggleAllProps) {
  // The *answer*, not the record it is derived from. Both studio panels write into one
  // `openSections`, so selecting the record would re-render this button every time a group in the
  // other panel moved; a boolean is compared by `Object.is` and bails out unless this panel's own
  // answer actually changed.
  const allOpen = useSectionStore((state) =>
    sections.every((section) => state.openSections[section.id] ?? section.defaultOpen),
  );
  const setSectionsOpen = useSectionStore((state) => state.setSectionsOpen);

  const action = allOpen ? 'Collapse' : 'Expand';

  return (
    <button
      type="button"
      // The visible text is the start of the accessible name rather than being replaced by it, so a
      // voice-control user asking for "expand all" still matches what they can read.
      aria-label={`${action} all ${panelLabel} sections`}
      onClick={() => {
        setSectionsOpen(
          sections.map((section) => section.id),
          !allOpen,
        );
      }}
      // The app's established secondary button, to the class — `PresetRenameForm`'s Cancel,
      // `HistoryFooter`'s export, the quantiser's scale candidates. A quieter, smaller, uppercase
      // variant here would be a fifth spelling of a solved control, and it read as a disabled label
      // in the slot the `Technical Directives` badge used to occupy.
      className="shrink-0 rounded-lg border border-foundry-600 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
    >
      {action} all
    </button>
  );
}
