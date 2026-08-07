import { describe, expect, it } from 'vitest';
import { MAX_ANATOMY_MULTIPLIER, NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { directionalModeChoices } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/index.ts';
import { modesFor } from '../constants/sheetPlans/index.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { NO_ADDITIONAL_ANATOMY as NONE_ANATOMY } from '../constants/anatomy.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { calculateAtlasMetrics, widthBiasFor } from './atlasCalculator.ts';
import { componentCountFor } from './componentSet.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * One number, five readers.
 *
 * The component count is stated by the prompt's contract, its self-audit, its inventory heading, the
 * mode selector and the atlas grid — and `componentSet.ts` exists so all five arrive at it through
 * one sum. A count that disagrees with its own inventory is the silently-wrong sheet v2 was
 * rewritten to prevent, so these assertions are about *agreement* rather than about any one value.
 *
 * Separate from `promptCompiler.test.ts` because it is a separate responsibility: that file is about
 * what the compiler *says*, this one about whether the arithmetic behind it holds together. The two
 * readers that never see the compiled prompt — the selector and the atlas — are the ones that can
 * drift in silence.
 */
const SUBJECT = DEFAULT_PRESET.subject;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_PRESET.output, ...overrides };
}

/**
 * Every pairing that actually exists. Iterating the mode union alone would ask a character for a
 * tileset — the pairing this whole module now makes unreachable — so the pairs come from the plan
 * table, which is the only place that knows which combinations are real.
 */
const PAIRS = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).map((mode) => ({ category, mode })),
);

describe('component counts', () => {
  it.each(PAIRS)(
    '$category / $mode states one count consistently across the prompt, the inventory, the selector and the atlas',
    ({ category, mode }) => {
      // A subject naming no additional anatomy, so the plan's own count is the whole count here. The
      // block below covers what happens when a subject adds to it.
      const subject = { ...defaultSubjectFor(category), additional_anatomy: NONE_ANATOMY };
      const count = componentCountFor(category, mode, []);
      expect(Number.isInteger(count) && count > 0).toBe(true);

      // The prompt states it twice — once as the contract, once as the self-audit — and both must
      // be the same number the inventory below them lists.
      const prompt = generatePrompt(category, subject, withOutput({ directionalMode: mode }));
      expect(prompt).toContain(`Exactly ${count} components`);
      expect(prompt).toContain(`Component count is exactly ${count}.`);
      // The inventory's own heading is the fourth statement of the number, and the one that reads
      // right beside the entries — a heading disagreeing with section 0 is what a model resolves
      // arbitrarily.
      expect(prompt).toContain(`### Component inventory — ${count} in total`);

      // The selector must promise the same number the prompt will ask for.
      const choice = directionalModeChoices(category, []).find((candidate) => candidate.value === mode);
      expect(choice?.label).toContain(String(count));

      // And the atlas has to lay out a grid that actually holds them.
      const metrics = calculateAtlasMetrics({
        canvasSize: 2048,
        padding: 4,
        componentCount: count,
        widthBias: widthBiasFor('WIDE_16_9'),
      });
      expect(metrics.columns * metrics.rows).toBeGreaterThanOrEqual(count);
    },
  );

  it('has no pairing asking for more than a model can deliver', () => {
    // 111 components in one image was deleted for this reason; the ceiling is roughly 40.
    for (const { category, mode } of PAIRS) {
      expect(
        componentCountFor(category, mode, []),
        `${category}/${mode} exceeds the practical ceiling`,
      ).toBeLessThanOrEqual(PRACTICAL_COMPONENT_CEILING);
    }
  });
});

describe('the count once a subject names anatomy of its own', () => {
  /** `CUTOUT_RIG_SINGLE_DIRECTION`: fifteen pieces, and room to add to them. */
  const RIG = withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' });
  // Derived, not restated: the plan is the only place the figure lives now.
  const BASE = componentCountFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', []);

  function withAnatomy(additional_anatomy: string): SubjectDefinition {
    return { ...SUBJECT, additional_anatomy };
  }

  it('counts named anatomy into the contract and the self-audit alike', () => {
    // The defect this resolves: v2's section 1 made additional anatomy separate pieces while section
    // 0 demanded exactly N and section 4 listed exactly N, so a subject with a tail asked for more
    // pieces than it counted. Both statements of the number have to move together.
    const prompt = generatePrompt('CHARACTER', withAnatomy('Demon Horn ×2, Tail ×1'), RIG);

    expect(prompt).toContain(`Exactly ${String(BASE + 3)} components`);
    expect(prompt).toContain(`Component count is exactly ${String(BASE + 3)}.`);
  });

  it('gives every named piece its own inventory entry, last in reading order', () => {
    // Labels are banned, so grid position is the only identity map. Appending keeps every base entry
    // at the index the mode's inventory promised.
    const prompt = generatePrompt('CHARACTER', withAnatomy('Demon Horn ×2, Tail ×1'), RIG);

    expect(prompt).toContain('#### Additional anatomy — 3');
    expect(prompt).toContain(`They come last in reading order, after the ${String(BASE)} components above:`);
    expect(prompt).toContain('- Demon Horn ×2.');
    expect(prompt).toContain('- Tail ×1.');
    // And the base inventory is intact above it.
    expect(prompt).toContain('Head ×1, torso ×1, pelvis ×1.');
  });

  it('states it in the subject definition as well as the inventory', () => {
    const prompt = generatePrompt('CHARACTER', withAnatomy('Serpentine Tail ×1'), RIG);
    expect(prompt).toContain('- Additional genuine anatomy: Serpentine Tail ×1');
  });

  it('leaves the count untouched, and says nothing, when there is none', () => {
    // `NONE` is a statement, not a name. Emitting `Additional genuine anatomy: NONE` would put a
    // content-shaped token in the highest-weighted section — the defect that deleted `DEFINED`.
    for (const value of [NO_ADDITIONAL_ANATOMY, '']) {
      const prompt = generatePrompt('CHARACTER', withAnatomy(value), RIG);

      expect(prompt).toContain(`Exactly ${String(BASE)} components`);
      expect(prompt).not.toContain('Additional anatomy —');
      // The label line, not the phrase: section 1's prose names additional anatomy either way, to
      // tell the generator that such pieces are the one thing it does not paint onto a neighbour.
      expect(prompt).not.toContain('- Additional genuine anatomy:');
      expect(prompt).not.toContain(NO_ADDITIONAL_ANATOMY);
    }
  });

  it('offers the same total to the mode selector, the atlas and the prompt', () => {
    // The two readers that do not read the compiled prompt are the ones that can drift silently: a
    // selector still promising the mode's own count beside a prompt demanding more is how a user
    // comes to expect the wrong number of components. This pins the arithmetic they share — the
    // components themselves are wired up in `SheetFields` and `AtlasCalculatorModal`, which are
    // driven in the browser rather than here.
    const anatomy = parseAdditionalAnatomy('Demon Horn ×2, Tail ×1');
    const count = componentCountFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', anatomy);
    expect(count).toBe(BASE + 3);

    const label = directionalModeChoices('CHARACTER', anatomy).find(
      (choice) => choice.value === 'CUTOUT_RIG_SINGLE_DIRECTION',
    )?.label;
    expect(label).toContain(String(count));
    expect(generatePrompt('CHARACTER', withAnatomy('Demon Horn ×2, Tail ×1'), RIG)).toContain(
      `Exactly ${String(count)} components`,
    );

    const metrics = calculateAtlasMetrics({
      canvasSize: 2048,
      padding: 4,
      componentCount: count,
      widthBias: widthBiasFor('WIDE_16_9'),
    });
    expect(metrics.columns * metrics.rows).toBeGreaterThanOrEqual(count);
  });

  it('holds the count to something a sheet can be drawn to, however the field is typed', () => {
    // The count is allocated, not just printed — the atlas preview renders a cell per component.
    // An unbounded multiplier would reach it, and past `Number.MAX_SAFE_INTEGER` the prompt itself
    // would read "Exactly Infinity components".
    const prompt = generatePrompt('CHARACTER', withAnatomy('Tail ×5000000000'), RIG);

    expect(prompt).toContain(`Exactly ${String(BASE + MAX_ANATOMY_MULTIPLIER)} components`);
    expect(prompt).not.toContain('Infinity');
    expect(prompt).not.toContain('e+');
    // Section 1 states the clipped count too, so it cannot promise more than section 4 lists.
    expect(prompt).toContain(`- Additional genuine anatomy: Tail ×${String(MAX_ANATOMY_MULTIPLIER)}`);
  });

  it('describes the same anatomy in the subject definition and the inventory', () => {
    // Both go through one formatter. Before that, section 1 carried the raw field while section 4
    // carried the parse, so `Tail ×0` said one thing at the top of the prompt and another below.
    const prompt = generatePrompt('CHARACTER', withAnatomy('Tail ×0'), RIG);

    expect(prompt).toContain('- Additional genuine anatomy: Tail ×1');
    expect(prompt).toContain('- Tail ×1.');
    expect(prompt).toContain(`Exactly ${String(BASE + 1)} components`);
    // Never two counts in one entry — that is an instruction to draw both.
    expect(prompt).not.toContain('×0');
  });

  it('passes marker-shaped anatomy text through instead of throwing', () => {
    // The field now reaches section 4 as well as section 1, so it has a second way to break a render
    // that has no error boundary above it. Odd text stays odd text; it does not throw the app out.
    const odd = '[IF:X] Tail [/IF] ×2';
    expect(() => generatePrompt('CHARACTER', withAnatomy(odd), RIG)).not.toThrow();

    const prompt = generatePrompt('CHARACTER', withAnatomy(odd), RIG);
    expect(prompt).toContain('- [IF:X] Tail [/IF] ×2.');
    expect(prompt).toContain(`Exactly ${String(BASE + 2)} components`);
  });
});
