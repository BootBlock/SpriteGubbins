import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useSectionStore } from '../../stores/useSectionStore.ts';
import type { SectionDefinition } from '../../types/ui.ts';
import { sectionElementId } from '../../utils/sectionElementId.ts';
import { ControlTooltip } from './ControlTooltip.tsx';
import { Button } from './Button.tsx';

interface SectionToggleAllProps {
  readonly sections: readonly SectionDefinition[];
  /** The panel these sections belong to, for an accessible name that says *which* "all". */
  readonly panelLabel: string;
}

/**
 * Open or shut every group in one panel.
 *
 * Nielsen Norman's accordion guidance asks for this outright, and the arithmetic backs it: with
 * three of `OutputConfig`'s six groups folded by default, a user who wants to see everything is
 * otherwise clicking three headers.
 *
 * It lives in the panel header rather than beside the groups because nothing interactive may sit
 * inside a `<summary>` — the summary is itself the control.
 *
 * The label states what the button will *do*, not what it currently is, and flips only when every
 * group is open: from a half-folded panel the useful move is to finish opening it. `aria-expanded`
 * states the other half — what the groups currently *are* — because the label alone changing is not
 * something a screen reader reliably re-announces, and without it five or six regions appear and
 * disappear with no programmatic signal at all.
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
  const controlledIds = sections.map((section) => sectionElementId(section.id));

  /**
   * Collapsing must not throw the keyboard user out of the document.
   *
   * Whatever they were on may be *inside* a group this click is about to fold, and a shut
   * `<details>` puts its contents in a `content-visibility: hidden` subtree — so the focused element
   * stops being focusable and focus falls back to `<body>`, losing both the position and the ring.
   * An ordinary Chromium mouse click hides it, because the button takes focus first; voice control,
   * assistive-technology activation and a plain click in Safari all reach it.
   *
   * So focus moves to the summary of the group being closed — the standard disclosure recovery,
   * which leaves the user exactly where their work was, on the control that reopens it. Done
   * *before* the store write, while that summary is still the obvious destination.
   */
  function keepFocusInTheDocument(): void {
    const holder = document.activeElement?.closest('details');
    if (holder && controlledIds.includes(holder.id)) holder.querySelector('summary')?.focus();
  }

  return (
    // `shrink-0` moves out to the wrapper with the button: it is what the button was saying about its
    // own box in the panel header's flex row, and the wrapper is the item in that row now.
    <ControlTooltip
      hint={`${action} all`}
      text={STUDIO_ACTION_TOOLTIPS.expandAll}
      className="relative inline-flex shrink-0"
    >
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={allOpen}
        aria-controls={controlledIds.join(' ')}
        // The visible text is the start of the accessible name rather than being replaced by it, so a
        // voice-control user asking for "expand all" still matches what they can read.
        aria-label={`${action} all ${panelLabel} sections`}
        onClick={() => {
          if (allOpen) keepFocusInTheDocument();
          setSectionsOpen(
            sections.map((section) => section.id),
            !allOpen,
          );
        }}
      >
        {action} all
      </Button>
    </ControlTooltip>
  );
}
