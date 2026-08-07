import { describe, expect, it } from 'vitest';
import { TARGET_MODELS } from '../constants/models.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import { deliberates, supportsManifest } from './targetCapabilities.ts';

/**
 * These decide what a target is *sent*, so getting one wrong is silent: the prompt still reads
 * correctly, it just carries a section the endpoint cannot act on, or drops one it could have.
 */

/** The two targets that read the prompt as instructions rather than as one caption. */
const CONVERSATIONAL = ['GENERIC', 'CHATGPT_5_6_SOL'] as const;

/** Everything else — single-pass image endpoints. */
const IMAGE_ENDPOINTS = ['MIDJOURNEY', 'STABLE_DIFFUSION', 'FLUX', 'GOOGLE_IMAGEN', 'DALLE_3'] as const;

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
    for (const target of CONVERSATIONAL) expect(deliberates(target), target).toBe(true);
  });

  it('is false for every single-pass image endpoint', () => {
    // Section 9's self-audit asks the reader to check the sheet and redraw before delivering.
    // These generate in one pass, so that names a step they do not have.
    for (const target of IMAGE_ENDPOINTS) expect(deliberates(target), target).toBe(false);
  });
});

describe('supportsManifest', () => {
  it('is true only where there is a text channel to return one through', () => {
    for (const target of CONVERSATIONAL) expect(supportsManifest(target), target).toBe(true);
    for (const target of IMAGE_ENDPOINTS) expect(supportsManifest(target), target).toBe(false);
  });
});

describe('the two capabilities are asked separately', () => {
  it('reads each from its own field rather than one standing in for the other', () => {
    // They coincide across today's seven targets — every conversational one emits text and every
    // image one does not — which is exactly the condition under which a single flag serving both
    // would pass every test above while being wrong the moment a target splits them.
    for (const model of TARGET_MODELS) {
      expect(deliberates(model.id), model.id).toBe(model.capabilities.deliberates);
      expect(supportsManifest(model.id), model.id).toBe(model.capabilities.emitsText);
    }
  });
});
