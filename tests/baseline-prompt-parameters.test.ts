import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import {
  ASPECT_RATIOS,
  DIRECTIONAL_MODES,
  LIGHTING_MODELS,
  OUTLINE_STYLES,
  PALETTE_LIMITS,
  RESOLUTION_PROFILES,
  SURFACE_DETAILS,
  TARGET_MODEL_IDS,
} from '../src/types/output.ts';
import { BACKGROUND_KEYS } from '../src/types/rendering.ts';
import { JOINT_CAP_STYLES, OVERLAP_MARGINS, RIG_MODES } from '../src/types/rigging.ts';
import { nativeGridScale } from '../src/utils/nativeGridScale.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';
import { deliberates, returnsText } from '../src/utils/targetCapabilities.ts';
import { asProse } from './asProse.ts';
import {
  codeSpans,
  documentBlock,
  markdownTables,
  RENDERING_TABLE_HEADINGS,
} from './baselinePromptDocument.ts';
import { BLANK_SUBJECT } from './blankSubject.ts';
import { sectionNumber, sectionTitle, TEMPLATE_GATES } from './templateGates.ts';

/**
 * The parameter tables in §2 of `docs/todo/baseline-prompt-new.md`, read back against the output
 * configuration they describe.
 *
 * The document's banner already holds §2 to this standard and says why: it renamed `EMIT_MANIFEST`
 * in "the two tables" because they describe the surface the compiler offers, so a reader consults
 * them for a flag name, and it removed `CUSTOM` from the `DIRECTIONS` table "so the table matches
 * the code". Nothing enforced either correction, which is the argument issue #222 made one section
 * out from the fence `prompt-template-mirror.test.ts` pins.
 *
 * **Every table in §2 is read by something.** A table headed by a parameter is read here; a table
 * under one of the `RENDERING_TABLE_HEADINGS` is read by `baseline-prompt-rendering.test.ts`; a table
 * anywhere else fails. Within a parameter table, each row's values cell has to take a shape this
 * suite recognises — it lists the parameter's values, states the kind of value the field holds,
 * names a library the hardware suite reads, or defers to another section — and a cell in none of
 * those shapes fails, so the answer to a new shape is to teach this suite what it means.
 *
 * **Two kinds of cell are pointers, and nothing follows them.** A values cell reading `see §7` is
 * accepted as a deferral, and §7 is read by none of these suites. The section references in the
 * `Why` column — `(§8.4)`, `(§5)` — point at the document's own reasoning. The `Why` and `Emits`
 * cells that state a fact about the code are read by the check for that fact: `SPRITE_TARGET_SIZE`'s
 * here, and the three libraries' in the hardware suite.
 *
 * The subject paragraphs are `baseline-prompt-subject.test.ts`'s, and the prose around the hardware,
 * palette and reference table is `baseline-prompt-hardware.test.ts`'s.
 */
const SECTION = '## 2. Parameters';

/** Each parameter whose row lists its values, and the `as const` array that defines them. */
const ENUMERATED: Readonly<Record<string, readonly string[]>> = {
  DIRECTIONAL_MODE: DIRECTIONAL_MODES,
  SURFACE_DETAIL: SURFACE_DETAILS,
  RESOLUTION_PROFILE: RESOLUTION_PROFILES,
  PALETTE_LIMIT: PALETTE_LIMITS,
  OUTLINE_STYLE: OUTLINE_STYLES,
  LIGHTING_MODEL: LIGHTING_MODELS,
  ASPECT_RATIO: ASPECT_RATIOS,
  RIG_MODE: RIG_MODES,
  JOINT_CAP_STYLE: JOINT_CAP_STYLES,
  OVERLAP_MARGIN: OVERLAP_MARGINS,
  BACKGROUND_KEY: BACKGROUND_KEYS,
};

/** What a free-form row says its parameter holds, read off how the values cell opens. */
const KINDS: readonly { readonly opens: RegExp; readonly holds: (value: unknown) => boolean }[] = [
  { opens: /^(?:boolean\b|`false` · `true`$)/, holds: (value) => typeof value === 'boolean' },
  { opens: /^integer$/, holds: (value) => Number.isInteger(value) },
  { opens: /^(?:free text|list)\b/, holds: (value) => typeof value === 'string' },
];

/** The rows `baseline-prompt-hardware.test.ts` reads, whose values are a library of definitions. */
const LIBRARIES = new Set(['HARDWARE_PROFILE', 'PALETTE', 'STYLE_REFERENCE']);

/** A row that defers its values to another section of the document outright. */
const DEFERS = /^see §\d+$/;

const DEFAULTS = new Map<string, unknown>(Object.entries(DEFAULT_OUTPUT_CONFIG));

/** `DIRECTIONAL_MODE` as the configuration spells it, `directionalMode`. */
function configField(parameter: string): string {
  return parameter.toLowerCase().replace(/_([a-z0-9])/g, (_, initial: string) => initial.toUpperCase());
}

/** Every body row of every §2 table whose first column names a parameter. */
function parameterRows(): readonly (readonly string[])[] {
  return markdownTables(documentBlock(SECTION))
    .filter((table) => table.header[0] === 'Parameter')
    .flatMap((table) => table.rows);
}

function rowFor(parameter: string): readonly string[] {
  const row = parameterRows().find((cells) => codeSpans(cells[0] ?? '')[0] === parameter);
  if (row === undefined) throw new Error(`§2 no longer has a row for \`${parameter}\`.`);
  return row;
}

describe('§2 of the baseline-prompt document names the parameters the compiler offers', () => {
  it('reads every table in §2, here or in the rendering suite', () => {
    const block = documentBlock(SECTION);
    const headings = block.split('\n').filter((line) => line.startsWith('### '));
    const bySubsection = headings.map((heading) => ({
      heading,
      tables: markdownTables(documentBlock(SECTION, heading)),
    }));
    const unread = bySubsection.flatMap(({ heading, tables }) =>
      tables
        .filter(
          (table) =>
            table.header[0] !== 'Parameter' &&
            !RENDERING_TABLE_HEADINGS.some((prefix) => heading.startsWith(prefix)),
        )
        .map((table) => `${heading}: | ${table.header.join(' | ')} |`),
    );

    // Every table sits under a subsection heading, so none is outside the walk above.
    expect(bySubsection.reduce((total, { tables }) => total + tables.length, 0)).toBe(
      markdownTables(block).length,
    );
    expect(
      RENDERING_TABLE_HEADINGS.filter((prefix) => !headings.some((heading) => heading.startsWith(prefix))),
    ).toStrictEqual([]);
    expect(unread).toStrictEqual([]);
  });

  it('names only parameters the output configuration has', () => {
    const block = documentBlock(SECTION);
    const inHeadings = block
      .split('\n')
      .filter((line) => line.startsWith('### '))
      .flatMap((line) => codeSpans(line));
    const named = [...parameterRows().map((row) => codeSpans(row[0] ?? '')[0] ?? ''), ...inHeadings];

    expect(named.length).toBeGreaterThan(20);
    expect(named.filter((parameter) => !DEFAULTS.has(configField(parameter)))).toStrictEqual([]);
  });

  it('makes a claim some check reads in every parameter row', () => {
    const rows = parameterRows();
    const unread = rows.filter((row) => {
      const parameter = codeSpans(row[0] ?? '')[0] ?? '';
      const values = row[1] ?? '';
      return !(
        Object.hasOwn(ENUMERATED, parameter) ||
        LIBRARIES.has(parameter) ||
        DEFERS.test(values) ||
        KINDS.some((kind) => kind.opens.test(values))
      );
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(unread).toStrictEqual([]);
  });

  it('lists exactly the values each enumerated parameter takes, and none it retired', () => {
    for (const [parameter, union] of Object.entries(ENUMERATED)) {
      const cell = rowFor(parameter)[1] ?? '';
      const retired = [...cell.matchAll(/~~(.*?)~~/g)].flatMap((match) => codeSpans(match[1] ?? ''));
      const live = codeSpans(cell.replace(/~~.*?~~/g, ''));

      expect([...live].sort(), `§2's \`${parameter}\` row`).toStrictEqual([...union].sort());
      expect(
        retired.filter((value) => union.includes(value)),
        `§2's \`${parameter}\` row`,
      ).toStrictEqual([]);
    }

    expect(documentBlock(SECTION)).toContain('`RESOLUTION_PROFILE` loses its `_PIXEL_ART` suffixes');
    expect(RESOLUTION_PROFILES.filter((profile) => profile.endsWith('_PIXEL_ART'))).toStrictEqual([]);
  });

  it('gives each free-form parameter the kind of value the configuration holds', () => {
    const read = parameterRows().filter((row) => KINDS.some((kind) => kind.opens.test(row[1] ?? '')));

    expect(read.length).toBeGreaterThan(0);
    for (const row of read) {
      const parameter = codeSpans(row[0] ?? '')[0] ?? '';
      const kind = KINDS.find((candidate) => candidate.opens.test(row[1] ?? ''));
      expect(
        kind?.holds(DEFAULTS.get(configField(parameter))),
        `§2 says \`${parameter}\` is ${String(row[1])}`,
      ).toBe(true);
    }
  });

  it('gates the component map and the adherence report on the capabilities the table names', () => {
    expect(rowFor('EMIT_COMPONENT_MAP')[1]).toContain('(text targets only)');
    expect(rowFor('EMIT_PROMPT_FEEDBACK')[1]).toContain('(targets that both deliberate *and* return text)');

    const heading = (prompt: string, section: string) =>
      prompt
        .split('\n')
        .some((line) => /^## \d+\. /.test(line) && line.endsWith(`. ${sectionTitle(section)}`));
    const answers = TARGET_MODEL_IDS.map((targetModel) => {
      const output = {
        ...DEFAULT_OUTPUT_CONFIG,
        targetModel,
        emitComponentMap: true,
        emitPromptFeedback: true,
      };
      const prompt = generatePrompt('CHARACTER', BLANK_SUBJECT, output);
      return {
        map: heading(prompt, 'COMPONENT_MAP') === returnsText(targetModel),
        report: heading(prompt, 'REPORT') === (deliberates(targetModel) && returnsText(targetModel)),
        textual: returnsText(targetModel),
      };
    });

    expect(new Set(answers.map((answer) => answer.textual))).toStrictEqual(new Set([true, false]));
    expect(answers.every((answer) => answer.map && answer.report)).toBe(true);
  });

  it('names the sections the native grid is stated in, and the settings that give a sheet one', () => {
    const why = rowFor('SPRITE_TARGET_SIZE')[2] ?? '';
    const sections = [
      ...new Set(
        TEMPLATE_GATES.filter(({ gate }) => gate.key === 'NATIVE_GRID' && gate.operator === '').map((line) =>
          sectionNumber(line.section),
        ),
      ),
    ].sort((a, b) => a - b);
    const target = { width: 16, height: 32 };

    expect(sections.length).toBeGreaterThan(0);
    expect(why).toContain(
      `the artwork is drawn on, and ${asProse(sections.map((number) => `§${String(number)}`))} state the whole-number scale`,
    );
    expect(why).toContain('On a pixel-art sheet under `CUSTOM`');
    expect(nativeGridScale('PIXEL_ART', 'CUSTOM', target, 'WIDE_16_9', 12)).not.toBeNull();
    expect(nativeGridScale('RETRO_PIXEL_ART', 'CUSTOM', target, 'WIDE_16_9', 12)).not.toBeNull();
    expect(nativeGridScale('PAINTED_2D', 'CUSTOM', target, 'WIDE_16_9', 12)).toBeNull();
    expect(nativeGridScale('PIXEL_ART', 'HIGH_RESOLUTION', target, 'WIDE_16_9', 12)).toBeNull();
  });
});
