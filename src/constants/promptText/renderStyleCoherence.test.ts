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

describe('section 2 of every stored style combination', () => {
  it('states no line that contradicts the style beside it', () => {
    const failures: string[] = [];
    // How many compiled combinations each rule applied to. A rule whose phrase no style states any
    // more would pass by never running, so each has to have been asked at least once.
    const applied = new Map<string, number>();

    for (const renderStyle of RENDER_STYLES) {
      for (const outlineStyle of OUTLINE_STYLES) {
        const keys: readonly BackgroundKey[] =
          outlineStyle === 'PURE_BLACK_OUTLINE'
            ? [DEFAULT_OUTPUT_CONFIG.backgroundKey, 'PURE_BLACK']
            : [DEFAULT_OUTPUT_CONFIG.backgroundKey];
        for (const backgroundKey of keys) {
          for (const lightingModel of LIGHTING_MODELS) {
            for (const paletteLimit of PALETTE_LIMITS) {
              for (const surfaceDetail of SURFACE_DETAILS) {
                const lines = linesOf({
                  ...DEFAULT_OUTPUT_CONFIG,
                  renderStyle,
                  outlineStyle,
                  lightingModel,
                  paletteLimit,
                  surfaceDetail,
                  backgroundKey,
                });
                for (const rule of RULES) {
                  const stated = lines[rule.line];
                  // A line the template dropped cannot contradict anything, except the lighting line a
                  // shaded style needs, which the rule's own `^$` names.
                  if (!rule.when.test(lines.style)) continue;
                  applied.set(rule.name, (applied.get(rule.name) ?? 0) + 1);
                  if (stated === '' && !rule.forbids.test('')) continue;
                  if (rule.forbids.test(stated)) {
                    failures.push(
                      `${rule.name}: ${renderStyle} ${outlineStyle} ${lightingModel} ${paletteLimit} ${surfaceDetail} ${backgroundKey} — “${stated}”`,
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(failures.slice(0, 20)).toEqual([]);
    for (const rule of RULES) expect(applied.get(rule.name) ?? 0, rule.name).toBeGreaterThan(0);
  });
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
