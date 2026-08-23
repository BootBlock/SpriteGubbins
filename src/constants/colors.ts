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
  parchment: '#e8dcb5',
  // The earth tone the vocabulary was missing. BUILDING already shipped "Dusk Violet & Ochre Rock",
  // whose swatch was therefore decided by the *other* colour in it; TERRAIN's sun-bleached sand had
  // no resolvable word at all. Adding it changes nothing that already resolved — `violet` still wins
  // that option, being earlier in the text.
  ochre: '#cc7722',
  // The two hair colours, which arrived with PORTRAIT. That category is the first in the app whose
  // primary colours are a *person* rather than a made thing, and hair is half of what a face is
  // recognised by — so its two commonest words had no swatch, where every stone, metal and hide the
  // other categories name already did. Neither is a fragment of a common English word, which is the
  // one rule this map has about what may be added.
  blonde: '#d9b36c',
  auburn: '#8c3b1b',
  // The near-future vocabulary's own hair and neon word, which arrived with PORTRAIT's cyberpunk
  // options. `cyan` and `plasma cyan` already covered one half of a neon pairing and nothing covered
  // the other, so "Pale Skin & Neon Magenta Hair" resolved to no colour at all. Not a fragment of any
  // English word, which is the one rule this map has about what may be added.
  magenta: '#d946ef',
  // The seven tones the option pools name and this vocabulary could not resolve, added alongside the
  // complementary options that made the gap visible: a creature's sand hide, a building's terracotta
  // render, an interface's cream card. Four of them also decide an option that already shipped —
  // `sand` takes three `… Sand & Rust` pairings and one `… Sand & Ochre` off their second word,
  // `slate` takes two of BUILDING's, `oak` gives a swatch to a door and a carved panel that had
  // none, and `straw` to a creature's mud splatter. Each moves the swatch onto the word the option
  // names *first*, which is the preference `parseColorFromText` documents.
  //
  // `sepia` was written here too and is deliberately absent: every string in the app that names it
  // has `parchment` or `cream` ahead of it, so the entry decided nothing. That is the shadowing this
  // file's own opening note records `cyan` doing to `plasma cyan`, and an entry no option can reach
  // is worth less than the line explaining it.
  sand: '#dcc9a0',
  oak: '#8f6a3f',
  cream: '#f5ecd7',
  terracotta: '#c96f4a',
  turquoise: '#40e0d0',
  slate: '#64748b',
  straw: '#e3c565',
  // Two words that name one colour, which the map already holds `acid green` and `plasma cyan` for.
  // Without it `slate` wins both of the app's `Slate Blue` options on position and paints them the
  // grey-blue it is, where the name is the violet-blue it is not — the longest name at a position
  // wins, which is what makes the compound the fix rather than a reordering.
  'slate blue': '#6a5acd',
};
