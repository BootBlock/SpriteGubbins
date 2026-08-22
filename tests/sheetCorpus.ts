import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createImage } from '../src/utils/imageData.ts';
import { decodePng } from '../src/test/decodePng.ts';

/**
 * The eight reference sheets in `test_sprites/`, as `ImageData`.
 *
 * The only real generator output this project has, and the corpus every measurement about *what
 * models actually return* has to be checked against. CLAUDE.md describes them one by one and says
 * why there are eight rather than one: `armour.png` is the reference every calibration figure in
 * `constants/quantiser.ts` and `constants/autoTune.ts` is measured on, and the other seven exist so
 * a recalibration can be checked on sheets it was not fitted to.
 *
 * Loaded from disk rather than committed as a fixture, because the sheets *are* the fixture — a
 * derived copy would be a second thing to keep in step, and a re-encode would sand off exactly the
 * resampling artefacts these readings are being measured through.
 *
 * Slow enough to be worth naming: eight sheets of one to two megapixels each, inflated and
 * unfiltered in JavaScript. A test over the whole corpus loads it once, in `beforeAll`.
 *
 * In `tests/` rather than beside `decodePng` in `src/test/`, because it reads the filesystem: the
 * app's program carries no Node types, deliberately, so a `node:fs` import anywhere under `src/`
 * fails the type-check outright — and `tests/` is the program that exists for suites which assert
 * against files on disk. `columnSplit.ts` and `selectLabelBudget.ts` are the same kind of helper.
 */

/** A sheet's file name, without the directory — the name CLAUDE.md and the calibration docs use. */
export type CorpusSheetName =
  | 'armour.png'
  | 'character_space_marine_blue.png'
  | 'cyborg_black_red.png'
  | 'cyborg_healer.png'
  | 'cyborg_monk.png'
  | 'three-quarter-view_tiles1.png'
  | 'ui_elements1.png'
  | 'vehicles_and_props.png';

/**
 * Every sheet, in the order CLAUDE.md's own table lists them: the reference first, then the seven
 * it is checked against.
 */
export const CORPUS_SHEETS: readonly CorpusSheetName[] = [
  'armour.png',
  'cyborg_black_red.png',
  'character_space_marine_blue.png',
  'cyborg_monk.png',
  'cyborg_healer.png',
  'three-quarter-view_tiles1.png',
  'ui_elements1.png',
  'vehicles_and_props.png',
];

/**
 * One sheet, decoded. Truecolour, so every pixel comes back opaque — see `decodePng`.
 *
 * Resolved from `process.cwd()`, which Vitest sets to the project root, rather than from
 * `import.meta.url` — Vitest rewrites module URLs, so they are not `file:` URLs the filesystem can
 * be asked about. `tests/design-tokens.test.ts` records the same trap.
 */
async function loadCorpusSheet(name: CorpusSheetName): Promise<ImageData> {
  const path = resolve(process.cwd(), 'test_sprites', name);
  const decoded = await decodePng(new Uint8Array(await readFile(path)));
  const image = createImage(decoded.width, decoded.height);
  image.data.set(decoded.pixels);
  return image;
}

/** The whole corpus, decoded once — what a survey over all eight loads in `beforeAll`. */
export async function loadCorpus(): Promise<ReadonlyMap<CorpusSheetName, ImageData>> {
  const sheets = await Promise.all(
    CORPUS_SHEETS.map(async (name) => [name, await loadCorpusSheet(name)] as const),
  );
  return new Map(sheets);
}
