import { describe, expect, it } from 'vitest';
import { TARGET_MODELS } from '../constants/models.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import { deliberates, supportsManifest } from './targetCapabilities.ts';

/**
 * These decide what a target is *sent*, so getting one wrong is silent: the prompt still reads
 * correctly, it just carries a section the endpoint cannot act on, or drops one it could have.
 */

/**
 * The targets that read the prompt as instructions to work through rather than as one caption.
 *
 * The Gemini image models are in here on Google's own description — "Gemini 3 image models are
 * thinking models that use a reasoning process ('Thinking') for complex prompts", which cannot be
 * disabled — so "image model" and "single pass" are not the same question.
 */
const DELIBERATING = ['GENERIC', 'CHATGPT_5_6_SOL', 'GEMINI_FLASH_IMAGE', 'GEMINI_PRO_IMAGE'] as const;

/**
 * Deliberates, and still cannot return a manifest.
 *
 * Seedream 5.0 reasons over the brief and plans its layout before rendering, so it earns the
 * self-audit — but it hands back JPEG or PNG and nothing else, so there is no channel for the JSON.
 * It is the split the last test in this file was written in anticipation of, and it is why the two
 * capabilities cannot be collapsed into one flag: every other target answers both the same way.
 */
const DELIBERATING_IMAGE_ONLY = ['SEEDREAM'] as const;

/** Everything else — single-pass endpoints with no channel to answer back through. */
const SINGLE_PASS = [
  'QWEN_IMAGE',
  'MIDJOURNEY',
  'STABLE_DIFFUSION',
  'FLUX',
  'FLUX_API',
  'GPT_IMAGE',
] as const;

describe('the capability table', () => {
  it('sorts every id in the union into exactly one of the three lists above', () => {
    // Without this the lists are decoration: a target added to the union and to `TARGET_MODELS` but
    // to none of them would be asserted about nowhere, and every test in this file would still pass
    // — which is precisely the half-applied edit the rest of the file exists to catch.
    const sorted = [...DELIBERATING, ...DELIBERATING_IMAGE_ONLY, ...SINGLE_PASS];
    expect([...sorted].sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });

  it('covers every id in the union', () => {
    // The type guarantees each *entry* declares its capabilities; nothing in the type says the
    // list is complete, and a missing entry would throw only for the target nobody selected.
    expect(TARGET_MODELS.map((model) => model.id).sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });

  it('answers for every id without throwing', () => {
    for (const target of TARGET_MODEL_IDS) {
      expect(typeof deliberates(target), target).toBe('boolean');
      expect(typeof supportsManifest(target), target).toBe('boolean');
    }
  });
});

describe('deliberates', () => {
  it('is true for the targets that work through the prompt as a procedure', () => {
    for (const target of [...DELIBERATING, ...DELIBERATING_IMAGE_ONLY]) {
      expect(deliberates(target), target).toBe(true);
    }
  });

  it('is false for every single-pass image endpoint', () => {
    // Section 9's self-audit asks the reader to check the sheet and redraw before delivering.
    // These generate in one pass, so that names a step they do not have.
    for (const target of SINGLE_PASS) expect(deliberates(target), target).toBe(false);
  });
});

describe('supportsManifest', () => {
  it('is true only where there is a text channel to return one through', () => {
    for (const target of DELIBERATING) expect(supportsManifest(target), target).toBe(true);
    for (const target of SINGLE_PASS) expect(supportsManifest(target), target).toBe(false);
  });

  it('is false for a reasoning model that still returns only an image', () => {
    // The case that proves the two flags are read separately rather than one inferring the other:
    // asking Seedream for a JSON manifest spends tokens on an instruction it can only drop.
    for (const target of DELIBERATING_IMAGE_ONLY) {
      expect(deliberates(target), target).toBe(true);
      expect(supportsManifest(target), target).toBe(false);
    }
  });
});

describe('the two capabilities are asked separately', () => {
  it('reads each from its own field rather than one standing in for the other', () => {
    // They no longer coincide across the table — Seedream deliberates and returns no text — so one
    // flag standing in for both is now a failing arrangement rather than merely a fragile one.
    for (const model of TARGET_MODELS) {
      expect(deliberates(model.id), model.id).toBe(model.capabilities.deliberates);
      expect(supportsManifest(model.id), model.id).toBe(model.capabilities.emitsText);
    }
  });

  it('has at least one target where the two answers differ', () => {
    // Pins the property the test above rests on. Without this, deleting Seedream would silently
    // return the table to the state where a single flag would pass everything here.
    const split = TARGET_MODELS.filter(
      (model) => model.capabilities.deliberates !== model.capabilities.emitsText,
    );
    expect(split.map((model) => model.id)).not.toHaveLength(0);
  });
});
