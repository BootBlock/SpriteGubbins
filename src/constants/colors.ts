/**
 * Colour vocabulary the prompt compiler and the swatch renderer share.
 *
 * This is **domain data, not app styling** — the set of colour words a user can type into a
 * "Primary Colours" or "Accent Colours" field and still get a visual preview of. It is the one
 * place in the app where raw hex literals belong (see CLAUDE.md's design-token rule); nothing
 * here paints any part of the interface.
 *
 * **Order here is not significant.** `parseColorFromText` matches whole words and resolves ties
 * by position in the *text*, so every entry below is reachable and the list can be reordered or
 * extended freely. That is a change from the single-file application this migrates, which
 * scanned these entries in insertion order looking for a bare substring, and so had two visible
 * faults: `cyan` shadowed `plasma cyan` (making that entry dead), and `tan` matched inside
 * "Ti**tan**ium" and "**Tan**k" — painting a confidently wrong swatch. `utils/colorParser.ts`
 * documents the replacement rules; its tests pin them.
 *
 * Adding an entry is safe. Adding a name that is a common English *word fragment* is not — it
 * will match wherever that fragment appears as a standalone word.
 */
export const COLOR_HEX_MAP: Readonly<Record<string, string>> = {
  cyan: '#06b6d4',
  gold: '#f59e0b',
  crimson: '#ef4444',
  emerald: '#10b981',
  violet: '#8b5cf6',
  purple: '#a855f7',
  'acid green': '#84cc16',
  'plasma cyan': '#22d3ee',
  copper: '#b45309',
  obsidian: '#1e1e24',
  charcoal: '#334155',
  gunmetal: '#475569',
  navy: '#1e3a8a',
  silver: '#cbd5e1',
  tan: '#d97706',
  indigo: '#6366f1',
  rust: '#9a3412',
  white: '#ffffff',
  chrome: '#f8fafc',
  rose: '#f43f5e',
  orange: '#f97316',
  yellow: '#eab308',
  blue: '#3b82f6',
  red: '#dc2626',
  green: '#16a34a',
  bronze: '#d97706',
  vermilion: '#ea580c',
  teal: '#14b8a6',
  amber: '#f59e0b',
  black: '#0a0a0a',
  grey: '#6b7280',
  brown: '#78350f',
  pink: '#ec4899',
  brass: '#c9a227',
  umber: '#6b4423',
  driftwood: '#a89880',
};
