import { describe, expect, it } from 'vitest';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { LIGHTING_TEXT, PRACTICAL_COMPONENT_CEILING } from '../promptText/index.ts';
import { PRESETS } from './index.ts';

/**
 * Every preset has to compile, and the Unsung Saviour three have to keep carrying the numbers the
 * game's own art contract fixes — this is the test that catches a preset drifting away from the
 * project it was written for.
 */

describe('every shipped preset', () => {
  it('has a unique id', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRESETS)('$name compiles with no leftover marker and no placeholder token', (preset) => {
    const prompt = generatePrompt(preset.category, preset.subject, preset.output);
    expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]/);
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
      componentCountFor(preset.category, preset.output.directionalMode, anatomy),
      `${preset.name} exceeds the practical ceiling`,
    ).toBeLessThanOrEqual(PRACTICAL_COMPONENT_CEILING);
  });
});

describe('the Unsung Saviour presets', () => {
  const characterRig = PRESETS.find((preset) => preset.id === 'us-character-rig');
  const creatureRig = PRESETS.find((preset) => preset.id === 'us-creature-rig');
  const tileset = PRESETS.find((preset) => preset.id === 'us-tileset-3q');

  it('carries the character rig’s contract into the prompt', () => {
    if (!characterRig) throw new Error('the Unsung Saviour character rig preset should ship.');
    const prompt = generatePrompt(characterRig.category, characterRig.subject, characterRig.output);

    expect(prompt).toContain('48 × 96 px assembled');
    expect(prompt).toContain('- Camera elevation: 30° above the horizon');
    expect(prompt).toContain('flat magenta #FF00FF');
    expect(prompt).toContain('## 5. CUT-OUT RIG REQUIREMENTS');
    expect(prompt).toContain('head, chest, back, hand_left, hand_right');
    expect(prompt).toContain(
      `Exactly ${String(componentCountFor('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', []))} components`,
    );
  });

  it('keeps flat neutral albedo, which the game’s renderer depends on', () => {
    if (!characterRig) throw new Error('the Unsung Saviour character rig preset should ship.');
    // Load-bearing: the engine lights actors with CanvasModulate and Light2D and draws its own
    // shadows, so baked directional lighting would fight both.
    expect(characterRig.output.lightingModel).toBe('FLAT_NEUTRAL_ALBEDO');
    expect(generatePrompt(characterRig.category, characterRig.subject, characterRig.output)).toContain(
      LIGHTING_TEXT.FLAT_NEUTRAL_ALBEDO,
    );
  });

  it('gives the creature rig no sockets, because enemies do not wear player gear', () => {
    if (!creatureRig) throw new Error('the Unsung Saviour creature rig preset should ship.');
    expect(creatureRig.output.sockets).toBe('');
    expect(generatePrompt(creatureRig.category, creatureRig.subject, creatureRig.output)).not.toContain(
      'Attachment sockets',
    );
  });

  it('carries the tileset’s contract into the prompt', () => {
    if (!tileset) throw new Error('the Unsung Saviour tileset preset should ship.');
    const prompt = generatePrompt(tileset.category, tileset.subject, tileset.output);

    expect(prompt).toContain('48 × 48 px per tile');
    expect(prompt).toContain('Seamless tiling');
    expect(prompt).toContain(
      `Exactly ${String(componentCountFor('BUILDING', 'TILESET_MODULAR', []))} components`,
    );
    // Not articulated, so neither rig section appears.
    expect(prompt).not.toContain('## 5.');
  });

  it('asks the rig presets for a manifest, and the tileset not', () => {
    // A rig sheet is the case a manifest earns its keep on: fifteen anonymous cells become fifteen
    // labelled ones. A tileset has no bone parents to describe.
    expect(characterRig?.output.emitManifest).toBe(true);
    expect(creatureRig?.output.emitManifest).toBe(true);
    expect(tileset?.output.emitManifest).toBe(false);
  });
});
