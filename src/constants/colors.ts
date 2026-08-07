/**
 * Colour vocabulary the prompt compiler and the swatch renderer share.
 *
 * This is **domain data, not app styling** — the set of colour words a user can type into a
 * "Primary Colours" or "Accent Colours" field and still get a visual preview of. It is the one
 * place in the app where raw hex literals belong (see CLAUDE.md's design-token rule); nothing
 * here paints any part of the interface.
 *
 * **Order is behaviour.** `parseColorFromText` walks these entries in insertion order and takes
 * the first name *contained anywhere* in the text. Two consequences, both inherited verbatim
 * from the single-file application this migrates and both load-bearing on the swatch a user
 * sees — `utils/colorParser.test.ts` pins them:
 *
 * 1. **Earlier entries shadow later ones.** `cyan` precedes `plasma cyan`, so "Plasma Cyan"
 *    previews as `#06b6d4` and the `plasma cyan` entry is unreachable by that name. Likewise
 *    `gold` precedes `obsidian`, so "Deep Obsidian & Gold" previews as gold. (`acid green` does
 *    precede `green`, so that pair resolves the specific way round.)
 * 2. **Matching is substring, not word.** `tan` matches inside "Heavy Armoured **Tan**k" and
 *    "Ti**tan**ium", so those fields show a tan swatch.
 *
 * Reordering or renaming an entry therefore changes which swatch appears for existing option
 * strings. Treat this list as ordered data, not an alphabetised lookup.
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
};
