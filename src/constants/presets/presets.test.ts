import { describe, expect, it } from 'vitest';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { withCompanionOutputs } from '../../utils/imageConfig.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { LIGHTING_TEXT, PRACTICAL_COMPONENT_CEILING } from '../promptText/index.ts';
import { PRESETS } from './index.ts';

/**
 * Every preset has to compile, and the Unsung Saviour three have to keep carrying the numbers the
 * game's own art contract fixes — this is the test that catches a preset drifting away from the
 * project it was written for.
 */

/**
 * What a preset compiles to in a studio nobody has touched.
 *
 * A preset holds the image alone, so the two companion outputs have to come from somewhere to
 * compile at all — and the studio's own defaults are the honest choice: they are what a reader who
 * loads this preset and copies the prompt actually gets.
 */
function promptFor(preset: PresetArchetype): string {
  return generatePrompt(
    preset.category,
    preset.subject,
    withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG),
  );
}

/**
 * What a built-in's description has to be, mechanically.
 *
 * A floor rather than a target, on the same argument as the guidance in `constants/tooltips`: the
 * failure this catches is a preset added with `description: 'A knight'`, which looks covered from
 * the outside and says nothing the name did not.
 *
 * The ceiling is what `PresetCard`'s clamp was then set from — six lines of about forty characters
 * at the narrowest the card ever gets — so the two move together and in that order. A description
 * written past this one is not shown in full anywhere, which is worse than a shorter one.
 */
const SHORTEST_USEFUL_DESCRIPTION = 60;
const LONGEST_READABLE_DESCRIPTION = 220;

describe('every shipped preset', () => {
  it('has a unique id', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRESETS)('$name describes itself at a length its card can carry', (preset) => {
    expect(preset.description.length).toBeGreaterThanOrEqual(SHORTEST_USEFUL_DESCRIPTION);
    expect(preset.description.length).toBeLessThanOrEqual(LONGEST_READABLE_DESCRIPTION);
  });

  it.each(PRESETS)('$name describes itself in prose, punctuated as the app is', (preset) => {
    // A sentence shown to a stranger, not a label — and set with the same typographic apostrophes
    // and quotes as every other string in the bundle. A straight one is the tell that a line was
    // pasted in from somewhere else rather than written here.
    expect(preset.description).toMatch(/^[A-Z“]/);
    expect(preset.description.endsWith('.')).toBe(true);
    expect(preset.description.trim()).toBe(preset.description);
    expect(preset.description).not.toMatch(/ {2}/);
    expect(preset.description).not.toContain("'");
    expect(preset.description).not.toContain('"');
  });

  it('never describes two presets with the same sentence', () => {
    // The copy-paste that leaves one preset describing another. It is invisible in review, because
    // each card reads correctly on its own — and the library is where a reader goes to tell fifty
    // similar configurations apart.
    const byDescription = new Map<string, string[]>();
    for (const preset of PRESETS) {
      byDescription.set(preset.description, [...(byDescription.get(preset.description) ?? []), preset.name]);
    }

    expect([...byDescription.values()].filter((names) => names.length > 1)).toEqual([]);
  });

  it.each(PRESETS)('$name spells a pooled value the way its pool spells it', (preset) => {
    // The gap this closes: re-casing an option pool leaves every preset that names the old spelling
    // behind, and nothing notices. The combo boxes are unfiltered, so the preset still loads and
    // still compiles — it just puts the retired spelling into section 1 verbatim, which is the exact
    // inconsistency the re-casing set out to remove. All eight of the options fixed for #43 were
    // pinned in a preset as well as offered in a pool.
    //
    // Case-insensitive equality is the whole test, and deliberately not membership: a preset may
    // legitimately carry free text no pool offers, and sixty-two of them do — `Domed lid over a
    // banded body` is a worked example's own wording, in sentence case because a user typed it
    // rather than chose it. A value that matches a pooled option in every respect *but* case is not
    // that; it is the pool's own value, misspelled.
    const fields = CATEGORY_OPTIONS[preset.category].fields;

    for (const field of fields) {
      const value = preset.subject[field.key];
      if (value === '' || field.options.includes(value)) continue;

      const pooled = field.options.find((option) => option.toLowerCase() === value.toLowerCase());
      expect(
        pooled,
        `${preset.name} writes ${field.key} as "${value}", where the pool offers "${String(pooled)}"`,
      ).toBeUndefined();
    }
  });

  it.each(PRESETS)('$name compiles with no leftover marker and no placeholder token', (preset) => {
    const prompt = promptFor(preset);
    expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]|\[N\]/);
    expect(prompt).not.toContain('DEFINED');
    expect(prompt).toContain(`# MODULAR SPRITE-SHEET SPECIFICATION — ${preset.category}`);
  });

  it.each(PRESETS)('$name stays inside what one generation delivers', (preset) => {
    // The mode counts alone are checked in `promptCompiler.test.ts`; this checks the number a
    // preset *actually* asks for, which its additional anatomy adds to. A mode already at the
    // ceiling has no headroom, and 111 components was deleted outright for exactly this reason —
    // a request past the ceiling comes back as a plausible subset with the rest merged or dropped.
    const anatomy = parseAdditionalAnatomy(preset.subject.additional_anatomy);
    expect(
      componentCountFor(
        preset.category,
        preset.output.directionalMode,
        preset.output.directions,
        preset.output.sheetIndex,
        anatomy,
      ),
      `${preset.name} exceeds the practical ceiling`,
    ).toBeLessThanOrEqual(PRACTICAL_COMPONENT_CEILING);
  });

  it.each(PRESETS)('$name leaves the companion outputs to the user', (preset) => {
    // The type says a preset holds the image alone, and structural typing means the type alone
    // cannot enforce it: a whole `OutputConfig` spread into `output` type-checks, and would ship an
    // archetype with an opinion about whether *this* reader wants a JSON manifest handed back.
    expect(Object.keys(preset.output)).not.toContain('emitManifest');
    expect(Object.keys(preset.output)).not.toContain('emitPromptFeedback');
  });
});

describe('the Unsung Saviour presets', () => {
  const characterRig = PRESETS.find((preset) => preset.id === 'us-character-rig');
  const creatureRig = PRESETS.find((preset) => preset.id === 'us-creature-rig');
  const tileset = PRESETS.find((preset) => preset.id === 'us-tileset-3q');

  it('carries the character rig’s contract into the prompt', () => {
    if (!characterRig) throw new Error('the Unsung Saviour character rig preset should ship.');
    const prompt = promptFor(characterRig);

    expect(prompt).toContain('48 × 96 px assembled');
    expect(prompt).toContain('- Camera elevation: 30° above the horizon');
    expect(prompt).toContain('flat magenta #FF00FF');
    expect(prompt).toContain('## 5. CUT-OUT RIG REQUIREMENTS');
    expect(prompt).toContain('head, chest, back, hand_left, hand_right');
    expect(prompt).toContain(
      `Exactly ${String(componentCountFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'EIGHT_COMPASS', 0, []))} components`,
    );
  });

  it('keeps flat neutral albedo, which the game’s renderer depends on', () => {
    if (!characterRig) throw new Error('the Unsung Saviour character rig preset should ship.');
    // Load-bearing: the engine lights actors with CanvasModulate and Light2D and draws its own
    // shadows, so baked directional lighting would fight both.
    expect(characterRig.output.lightingModel).toBe('FLAT_NEUTRAL_ALBEDO');
    expect(promptFor(characterRig)).toContain(LIGHTING_TEXT.FLAT_NEUTRAL_ALBEDO);
  });

  it('gives the creature rig no sockets, because enemies do not wear player gear', () => {
    if (!creatureRig) throw new Error('the Unsung Saviour creature rig preset should ship.');
    expect(creatureRig.output.sockets).toBe('');
    expect(promptFor(creatureRig)).not.toContain('Attachment sockets');
  });

  it('carries the tileset’s contract into the prompt', () => {
    if (!tileset) throw new Error('the Unsung Saviour tileset preset should ship.');
    const prompt = promptFor(tileset);

    expect(prompt).toContain('48 × 48 px per tile');
    expect(prompt).toContain('Seamless tiling');
    expect(prompt).toContain(
      `Exactly ${String(componentCountFor('BUILDING', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, []))} components`,
    );
    // Not articulated, so neither rig section appears.
    expect(prompt).not.toContain('## 5.');
  });
});
