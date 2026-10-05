/**
 * The word lists `lookObject` reads a catalogue look by: what ends an object's words, what counts it,
 * and which nouns only look like participles. Kept apart from the reading so the rules stay readable.
 */

/** The words that name a quantity of an object rather than the object itself. */
export const QUANTITIES = new Set([
  'pair',
  'set',
  'roll',
  'bundle',
  'stack',
  'handful',
  'pile',
  'heap',
  'coil',
  'cluster',
  'sheaf',
  'bunch',
  'row',
  'trio',
  'string',
  'strip',
  'length',
]);

/** Participles that end in neither `-ed` nor `-ing`, read as the regular ones are. */
export const IRREGULAR_PARTICIPLES = new Set([
  'bound',
  'held',
  'hung',
  'struck',
  'spun',
  'cut',
  'worn',
  'torn',
  'broken',
  'driven',
  'drawn',
  'thrown',
  'laid',
  'lit',
  'split',
  'slung',
  'wound',
  'strung',
  'caught',
  'built',
  'sewn',
  'shot',
  'swung',
  'sprung',
  'frozen',
  'sunk',
]);

/** The words that open what an object carries, holds or does: after them the object has been named. */
export const PREPOSITIONS = new Set([
  'with',
  'of',
  'in',
  'on',
  'for',
  'from',
  'at',
  'to',
  'over',
  'under',
  'around',
  'above',
  'below',
  'beside',
  'behind',
  'inside',
  'through',
  'into',
  'onto',
  'across',
  'against',
  'between',
  'beneath',
  'along',
  'whose',
  'that',
  'by',
]);

/** Words that never modify a noun after them, so wherever they follow the object they end it. */
export const ENDERS = new Set([
  'a',
  'an',
  'the',
  'its',
  'their',
  'each',
  'together',
  'apart',
  'away',
  'aloft',
  'sideways',
  'full',
  'half',
]);

/**
 * What a participle that ends the object can be followed by, besides an {@link ENDERS} word or a
 * preposition: a particle or a manner (“swung open”, “spinning hard”, “slamming forward”).
 */
export const PARTICLES = new Set([
  'open',
  'shut',
  'up',
  'down',
  'out',
  'back',
  'off',
  'half',
  'hard',
  'low',
  'alone',
  'upright',
]);

/** A colour or a heat a participle can close on — “painted red”, “glowing white-hot”. */
export const STATES =
  /^(?:[a-z]+-hot|red|orange|amber|yellow|gold|green|teal|cyan|blue|violet|pink|grey|black|white|warm|soft|bright|dim|faint|deep)$/u;

/** Nouns that only look like participles, read as the objects they are. */
export const PARTICIPLE_SPELLED_NOUNS = new Set([
  'bed',
  'sled',
  'shed',
  'seed',
  'reed',
  'steed',
  'speed',
  'ring',
  'wing',
  'king',
  'string',
  'spring',
  'swing',
  'ping',
  'earring',
  'ceiling',
  'railing',
  'casing',
  'coupling',
  'legging',
  'leggings',
  'building',
  'painting',
  'bearing',
  'lining',
  'fitting',
  'housing',
  'awning',
  'spiderling',
  'sapling',
  'seedling',
  'hatchling',
  'dumpling',
  'filling',
  'pudding',
]);
