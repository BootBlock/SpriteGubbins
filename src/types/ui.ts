/**
 * Shell-level UI types — the things the chrome and the stores agree on, as opposed to anything a
 * single component keeps to itself.
 */

/**
 * The four top-level views. The studio is the app and the quantiser is what happens to what comes
 * back from it; presets and the architecture spec are reference material reached from the same
 * header.
 *
 * An `as const` array, like the closed sets in `types/output.ts`, because the tab **is** persisted:
 * the settings carry the view the app opens on, so `db/settingsParser.ts` has to validate a stored
 * value against the set. Declaring the union any other way would mean writing the four identifiers
 * out a second time in the parser, which is the drift this project's guards exist to prevent — the
 * list that *defines* a union is the only list a type guard may check against.
 *
 * The order is the union's alone and says nothing about the interface. `APP_TAB_CHOICES` in
 * `constants/ui.ts` is what decides the order the switcher shows them in.
 */
export const APP_TABS = ['studio', 'presets', 'spec', 'quantise'] as const;
export type AppTab = (typeof APP_TABS)[number];

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
