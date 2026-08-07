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

/** Everything else — single-pass endpoints with no channel to answer back through. */
const SINGLE_PASS = ['MIDJOURNEY', 'STABLE_DIFFUSION', 'FLUX', 'GPT_IMAGE'] as const;

describe('the capability table', () => {
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
    for (const target of DELIBERATING) expect(deliberates(target), target).toBe(true);
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
});

describe('the two capabilities are asked separately', () => {
  it('reads each from its own field rather than one standing in for the other', () => {
    // They coincide across today's eight targets, which is exactly the condition under which one
    // flag serving both would pass every test above while being wrong the moment a target splits
    // them — an image endpoint with a text side-channel, or a reasoning model that returns none.
    for (const model of TARGET_MODELS) {
      expect(deliberates(model.id), model.id).toBe(model.capabilities.deliberates);
      expect(supportsManifest(model.id), model.id).toBe(model.capabilities.emitsText);
    }
  });
});
