/**
 * Shell-level UI types — the things the chrome and the stores agree on, as opposed to anything a
 * single component keeps to itself.
 */

/**
 * The four top-level views. The studio is the app and the quantiser is what happens to what comes
 * back from it; presets and the architecture spec are reference material reached from the same
 * header.
 *
 * A bare union rather than the `as const` array the closed sets in `types/output.ts` use, because
 * nothing needs to enumerate these at runtime: the tab is never persisted, so no parser validates
 * it against the set, and the header renders a table of labels rather than raw identifiers.
 */
export type AppTab = 'studio' | 'presets' | 'spec' | 'quantise';

/**
 * A collapsible section's identity and the state it starts in.
 *
 * `useSectionStore` records only the sections a user has *moved*, so the default is what decides an
 * untouched one — and the panel's expand/collapse-all control has to apply the same rule to know
 * whether "all" are currently open. Declaring the pair together is what stops those two readings
 * drifting apart; a default written at the `CollapsibleSection` call site alone would leave the
 * toggle guessing.
 */
export interface SectionDefinition {
  /** Namespaced (`subject:palette`, `output:sheet`) — both studio panels share one open-set. */
  readonly id: string;
  readonly defaultOpen: boolean;
}
