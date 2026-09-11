import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import {
  DEFAULT_CAMERA_ELEVATIONS,
  DIRECTION_LISTS,
  describeDirections,
  PROJECTION_TEXT,
} from '../src/constants/promptText/camera.ts';
import { cameraElevationRange } from '../src/constants/promptText/elevation.ts';
import { RENDER_STYLE_TEXT } from '../src/constants/promptText/renderStyle.ts';
import { OBJECT_YAW } from '../src/constants/promptText/rotation.ts';
import { coreFacingChunks } from '../src/constants/sheetPlans/directionalViews.ts';
import { DIRECTION_SETS, PROJECTIONS, RENDER_STYLES, type Projection } from '../src/types/rendering.ts';
import { spellNumber } from '../src/utils/numberWords.ts';
import { asProse, codeSpans, documentBlock, markdownTables, oneLine } from './baselinePromptDocument.ts';

/**
 * §2's render-style, projection and direction tables, read back against the text the compiler emits
 * for each value.
 *
 * These are the three tables whose second column is **prose the prompt carries**, so a mismatch is
 * not a stale name but a document quoting an instruction no model is sent. They were correct when
 * issue #222 compared them row by row, and nothing kept them so; the direction table only compared
 * after normalising abbreviations the prompt never writes, which is why it now spells each set the
 * way `describeDirections` does.
 *
 * The direction callout's arithmetic is read back too — which yaws the classic sets hold, how many
 * facings an engine's horizontal flip turns them into, and how the compass core splits — because it
 * is the evidence for the studio's default and is stated as fact about the sets, not as history.
 */
const SECTION = '## 2. Parameters';

/** A table's rows as `value → remaining cells`, keyed by the value's code span. */
function rowsOf(heading: string): ReadonlyMap<string, readonly string[]> {
  const rows = markdownTables(documentBlock(SECTION, heading))[0]?.rows ?? [];
  return new Map(rows.map((row) => [codeSpans(row[0] ?? '')[0] ?? '', row.slice(1)]));
}

/** How the elevation column writes a projection's range. */
function elevationCell(projection: Projection): string {
  const { min, max } = cameraElevationRange(projection);
  return min === max
    ? `${String(min)}°`
    : `${String(min)}–${String(max)}°, default ${String(DEFAULT_CAMERA_ELEVATIONS[projection])}°`;
}

/** The yaw an engine's horizontal flip turns a facing into. */
const mirrored = (yaw: number) => (360 - yaw) % 360;

/** How many distinct facings a set reaches once each view may also be flipped. */
function facingsWithFlip(set: keyof typeof DIRECTION_LISTS): number {
  return new Set(
    DIRECTION_LISTS[set].flatMap((direction) => [OBJECT_YAW[direction], mirrored(OBJECT_YAW[direction])]),
  ).size;
}

describe('§2 of the baseline-prompt document quotes the rendering text the compiler emits', () => {
  it('quotes each render style’s description as the prompt carries it', () => {
    const rows = rowsOf('### `RENDER_STYLE`');

    expect([...rows.keys()].sort()).toStrictEqual([...RENDER_STYLES].sort());
    for (const style of RENDER_STYLES) {
      expect(rows.get(style)?.[0], `§2's \`${style}\` row`).toBe(RENDER_STYLE_TEXT[style]);
    }
  });

  it('quotes each projection’s description and elevation as the code has them', () => {
    const rows = rowsOf('### `PROJECTION`');

    expect([...rows.keys()].sort()).toStrictEqual([...PROJECTIONS].sort());
    for (const projection of PROJECTIONS) {
      expect(rows.get(projection), `§2's \`${projection}\` row`).toStrictEqual([
        PROJECTION_TEXT[projection],
        elevationCell(projection),
      ]);
    }

    const open = PROJECTIONS.filter((projection) => {
      const { min, max } = cameraElevationRange(projection);
      return min !== max;
    });
    expect(open).toStrictEqual([...rows.keys()].slice(0, 1));
    expect(oneLine(documentBlock(SECTION, '### `PROJECTION`'))).toContain(
      'only the first row leaves it open',
    );
  });

  it('spells each direction set the way the prompt does', () => {
    const rows = rowsOf('### `DIRECTIONS`');

    expect([...rows.keys()].sort()).toStrictEqual([...DIRECTION_SETS].sort());
    for (const set of DIRECTION_SETS) {
      // The emphasised aside on `THREE_CLASSIC` is the table's own annotation, not part of the set.
      const spelled = (rows.get(set)?.[0] ?? '').replace(/\s*\*\(.*\)\*$/, '');
      expect(spelled, `§2's \`${set}\` row`).toBe(describeDirections(DIRECTION_LISTS[set]));
    }
  });

  it('states the default set, and the arithmetic that chose it, as the sets have them', () => {
    const prose = oneLine(documentBlock(SECTION, '### `DIRECTIONS`'));
    const classic = DIRECTION_LISTS.THREE_CLASSIC.map((direction) => OBJECT_YAW[direction]);
    const added = DIRECTION_LISTS.FIVE_CLASSIC.map((direction) => OBJECT_YAW[direction]).filter(
      (yaw) => !classic.includes(yaw),
    );

    expect(prose).toContain(`\`${DEFAULT_OUTPUT_CONFIG.directions}\` is the studio's default set`);
    expect(added.every((yaw) => mirrored(yaw) === yaw)).toBe(true);
    expect(prose).toContain(`${asProse(added.map((yaw) => `${String(yaw)}°`))} are their own mirror`);
    expect(prose).toContain(`each of ${classic.join('/')} buys a distinct second facing`);
    expect(prose).toContain(`set at ${spellNumber(facingsWithFlip('THREE_CLASSIC'))} facings`);
    expect(prose).toContain(
      `takes the classic vocabulary to all ${spellNumber(facingsWithFlip('FIVE_CLASSIC'))}`,
    );
  });

  it('splits the compass core into a cardinal and a diagonal sheet', () => {
    const chunks = coreFacingChunks(DIRECTION_LISTS.EIGHT_COMPASS);
    const cardinal = (direction: keyof typeof OBJECT_YAW) => OBJECT_YAW[direction] % 90 === 0;

    expect(oneLine(documentBlock(SECTION, '### `DIRECTIONS`'))).toContain(
      'the `EIGHT_COMPASS` core splits into a cardinal and a diagonal sheet',
    );
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.every(cardinal)).toBe(true);
    expect(chunks[1]?.some(cardinal)).toBe(false);
  });
});
