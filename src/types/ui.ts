/**
 * Shell-level UI types — the things the chrome and the stores agree on, as opposed to anything a
 * single component keeps to itself.
 */

/**
 * The three top-level views. The studio is the app; presets and the architecture spec are
 * reference material reached from the same header.
 *
 * A bare union rather than the `as const` array the closed sets in `types/output.ts` use, because
 * nothing needs to enumerate these at runtime: the tab is never persisted, so no parser validates
 * it against the set, and the header renders a table of labels rather than raw identifiers.
 */
export type AppTab = 'studio' | 'presets' | 'spec';
