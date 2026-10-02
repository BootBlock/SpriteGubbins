import { describe, expect, it } from 'vitest';
import { HARDWARE_PROFILES } from '../hardware/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../presets/index.ts';
import { STYLE_REFERENCES } from '../styleReferences/index.ts';
import { sectionOf } from '../../test/promptSections.ts';
import { LIGHTING_MODELS, OUTLINE_STYLES, PALETTE_LIMITS, SURFACE_DETAILS } from '../../types/output.ts';
import type { BackgroundKey, OutputConfig } from '../../types/output.ts';
import { RENDER_STYLES } from '../../types/rendering.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { resolveLighting, resolveOutline, resolvePaletteLimit } from './styleSettings.ts';

/**
 * That section 2 never states a style and then contradicts it in the lines beside it (issue #406).
 *
 * Section 2 prints the style, the surface detail, the colour budget, the outline and the lighting as
 * separate lines, and each was a lookup on its own field — so shipped presets asked for "soft
 * blended forms" above "hard shadow bands", "a clean ink contour" above "No outline", and "visible
 * drawn line weight" above a contour one pixel wide.
 *
 * **Every rule below reads the compiled words, never the record that decides them.** A check written
 * against `RENDER_STYLE_TRAITS` would pass whatever that record said, and the defect was a record
 * that said something the words beside it contradicted. So each rule names a phrase a style line
 * states and a phrase a neighbouring line may not state beside it, and the loop compiles every stored
 * combination the studio can hold: ten styles, three outlines, three lighting models, four budgets and
 * four surface details, with the black key wherever the outline is black.
 */
function linesOf(output: OutputConfig): Record<'style' | 'surface' | 'budget' | 'edge' | 'lighting', string> {
  const section = sectionOf(generatePrompt('CHARACTER', DEFAULT_PRESET.subject, output), 'RENDER STYLE');
  const line = (label: string): string =>
    section
      .split('\n')
      .find((text) => text.startsWith(`- ${label}: `))
      ?.slice(label.length + 4) ?? '';

  return {
    style: section,
    surface: line('Surface-detail intensity'),
    budget: line('Palette strategy'),
    edge: line('Edge / outline treatment'),
    lighting: line('Lighting model'),
  };
}

/** A phrase a style states, and the phrase a named line may not carry beside it. */
interface Rule {
  readonly name: string;
  readonly when: RegExp;
  readonly line: 'surface' | 'budget' | 'edge' | 'lighting';
  readonly forbids: RegExp;
}

const RULES: readonly Rule[] = [
  // "Single-pixel" is a measurement only a pixel sheet can take.
  {
    name: 'a pixel contour outside pixel art',
    when: /^(?![\s\S]*pixel art)/,
    line: 'edge',
    forbids: /single-pixel/,
  },
  {
    name: 'hard shadow on a soft style',
    when: /- Style: [^\n]*soft/,
    line: 'lighting',
    forbids: /hard shadow/,
  },
  {
    name: 'no directional light beside shading that falls from one',
    when: /shadow steps|soft form shadow|per-face shading|the light stated above/,
    line: 'lighting',
    forbids: /no directional key|^Unlit|^$/,
  },
  {
    name: 'no outline beside a style’s own contour',
    when: /ink contour|line weight/,
    line: 'edge',
    forbids: /^No outline/,
  },
  {
    name: 'no colour count beside a small palette',
    when: /small palette/,
    line: 'budget',
    forbids: /no colour budget|richer colour variation/,
  },
  {
    name: 'a palette limit with no budget',
    when: /- Surface-detail intensity: [^\n]*palette limit/,
    line: 'budget',
    forbids: /no colour budget/,
  },
  {
    name: 'surface texturing beside the pixel discipline',
    when: /Do not render materials as microtexture/,
    line: 'surface',
    forbids: /surface texturing/,
  },
];

/** One stored combination of the style's neighbours, as section 2 compiles it. */
interface Combination {
  readonly where: string;
  readonly lines: ReturnType<typeof linesOf>;
}

/**
 * Every stored combination under one render style, compiled once and kept, so the per-style cases and
 * the check that every rule was compared somewhere read the same compilations.
 *
 * **One case per render style**, because the whole sweep as one test outgrew Vitest's five-second limit
 * on a slow runner; a style's combinations are a tenth of it.
 */
const COMBINATIONS = new Map<OutputConfig['renderStyle'], readonly Combination[]>();

function combinationsOf(renderStyle: OutputConfig['renderStyle']): readonly Combination[] {
  const cached = COMBINATIONS.get(renderStyle);
  if (cached !== undefined) return cached;
  const combinations: Combination[] = [];
  for (const outlineStyle of OUTLINE_STYLES) {
    const keys: readonly BackgroundKey[] =
      outlineStyle === 'PURE_BLACK_OUTLINE'
        ? [DEFAULT_OUTPUT_CONFIG.backgroundKey, 'PURE_BLACK']
        : [DEFAULT_OUTPUT_CONFIG.backgroundKey];
    for (const backgroundKey of keys) {
      for (const lightingModel of LIGHTING_MODELS) {
        for (const paletteLimit of PALETTE_LIMITS) {
          for (const surfaceDetail of SURFACE_DETAILS) {
            combinations.push({
              where: `${renderStyle} ${outlineStyle} ${lightingModel} ${paletteLimit} ${surfaceDetail} ${backgroundKey}`,
              lines: linesOf({
                ...DEFAULT_OUTPUT_CONFIG,
                renderStyle,
                outlineStyle,
                lightingModel,
                paletteLimit,
                surfaceDetail,
                backgroundKey,
              }),
            });
          }
        }
      }
    }
  }
  COMBINATIONS.set(renderStyle, combinations);
  return combinations;
}

/** Whether a rule compares a line on this combination: its style phrase is stated, its line present. */
function applies(rule: Rule, lines: Combination['lines']): boolean {
  // A line the template dropped cannot contradict anything, except the lighting line a shaded style
  // needs, which the rule's own `^$` names.
  if (!rule.when.test(lines.style)) return false;
  return lines[rule.line] !== '' || rule.forbids.test('');
}

describe('section 2 of every stored style combination', () => {
  it.each(RENDER_STYLES)('states no line that contradicts the %s style beside it', (renderStyle) => {
    const failures: string[] = [];
    for (const { where, lines } of combinationsOf(renderStyle)) {
      for (const rule of RULES) {
        const stated = lines[rule.line];
        if (applies(rule, lines) && rule.forbids.test(stated)) {
          failures.push(`${rule.name}: ${where} — “${stated}”`);
        }
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it.each(RULES.map((rule) => [rule.name, rule] as const))(
    'compares a line under the rule %s somewhere',
    (_name, rule) => {
      // A rule whose phrase no style states any more, or whose line is always dropped, would pass the
      // cases above by never running, so each has to have compared at least once.
      const compared = RENDER_STYLES.some((renderStyle) =>
        combinationsOf(renderStyle).some(({ lines }) => applies(rule, lines)),
      );
      expect(compared).toBe(true);
    },
  );
});

/**
 * That everything which applies style settings as a set applies a set the style can be drawn with.
 *
 * The compiler resolves a stored value the style cannot be drawn with, so a preset carrying one still
 * compiles coherently — but its card would describe a lighting or an outline its prompt never states,
 * and loading it would show the studio's controls one value while the store held another. Presets,
 * machine profiles and published looks are the three templates that set the style's neighbours.
 */
describe('a template that sets the render style', () => {
  function unresolved(
    renderStyle: OutputConfig['renderStyle'],
    settings: Partial<Pick<OutputConfig, 'outlineStyle' | 'lightingModel' | 'paletteLimit'>>,
  ): string[] {
    const wrong: string[] = [];
    const { outlineStyle, lightingModel, paletteLimit } = settings;
    if (outlineStyle !== undefined) {
      const outline = resolveOutline(renderStyle, outlineStyle);
      if (outline !== null && outline !== outlineStyle) wrong.push(`outline ${outlineStyle} → ${outline}`);
    }
    if (lightingModel !== undefined) {
      const lighting = resolveLighting(renderStyle, lightingModel);
      if (lighting !== null && lighting !== lightingModel) {
        wrong.push(`lighting ${lightingModel} → ${lighting}`);
      }
    }
    if (paletteLimit !== undefined && resolvePaletteLimit(renderStyle, paletteLimit) !== paletteLimit) {
      wrong.push(`budget ${paletteLimit} → ${resolvePaletteLimit(renderStyle, paletteLimit)}`);
    }
    return wrong;
  }

  it.each(PRESETS)('$name carries only settings its style can be drawn with', (preset) => {
    expect(unresolved(preset.output.renderStyle, preset.output)).toEqual([]);
  });

  it('holds for every machine profile and published look', () => {
    const wrong: string[] = [];
    for (const profile of Object.values(HARDWARE_PROFILES)) {
      if (profile === null) continue;
      const found = unresolved(profile.settings.renderStyle, profile.settings);
      if (found.length > 0) wrong.push(`${profile.label}: ${found.join(', ')}`);
    }
    for (const reference of Object.values(STYLE_REFERENCES)) {
      if (reference === null) continue;
      const { paletteLimit, ...rest } = reference.settings;
      const found = unresolved(reference.settings.renderStyle, {
        ...rest,
        ...(paletteLimit === null ? {} : { paletteLimit }),
      });
      if (found.length > 0) wrong.push(`${reference.name}: ${found.join(', ')}`);
    }
    expect(wrong).toEqual([]);
  });
});
