import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';
import { readPromptBudget } from './promptBudget.ts';
import { promptBudgetFor } from './targetCapabilities.ts';

/**
 * A ceiling nobody publishes and a ceiling of zero must not be confused, and neither must be
 * confused with "fits". These decide what the studio tells the user about a prompt it has already
 * composed, so a wrong answer here is worse than none.
 */

describe('readPromptBudget', () => {
  it('returns null where the vendor publishes no ceiling', () => {
    // Null means *unstated*, not unlimited — the preview shows nothing rather than a reassuring
    // tick. Three targets earn it: Midjourney documents no prompt limit at all, Seedream publishes
    // guidance rather than a ceiling, and Generic names no particular model, so there is no figure
    // to look up.
    expect(readPromptBudget('anything', 'MIDJOURNEY')).toBeNull();
    expect(readPromptBudget('anything', 'SEEDREAM')).toBeNull();
    expect(readPromptBudget('anything', 'GENERIC')).toBeNull();
  });

  it('records the ceilings that are published, rather than calling them unstated', () => {
    // These four were first written down as "none published" because the figures are on the model
    // pages rather than the image-generation guides. "I did not find one" is not "there isn't one",
    // and the whole point of `null` is that it makes the difference visible.
    expect(readPromptBudget('x', 'GEMINI_FLASH_IMAGE')?.budget.limit).toBe(131_072);
    expect(readPromptBudget('x', 'GEMINI_PRO_IMAGE')?.budget.limit).toBe(65_536);
    // Sol's is the *input* ceiling. Its model page states both, and 1,050,000 — the context window,
    // which the 128,000 output tokens are also drawn from — is the one this reading must not use:
    // every other row here is an input limit, and what is measured against it is the prompt alone.
    expect(readPromptBudget('x', 'CHATGPT_5_6_SOL')?.budget.limit).toBe(922_000);
    expect(readPromptBudget('x', 'GPT_IMAGE')?.budget.limit).toBe(32_000);
    expect(readPromptBudget('x', 'QWEN_IMAGE')?.budget.limit).toBe(4_500);
  });

  it('separates the two Flux tiers, which is the whole reason there are two', () => {
    // The open weights stop tokenising at 512 while Black Forest Labs' hosted tier reads 32K. One
    // entry had to state one of them, and stating 512 told a FLUX.2 [pro] user that a prompt their
    // endpoint reads comfortably was seven times over budget.
    expect(readPromptBudget('x', 'FLUX')?.budget.limit).toBe(512);
    expect(readPromptBudget('x', 'FLUX_API')?.budget.limit).toBe(32_000);
  });

  it('leaves Seedream unstated, because guidance is not a ceiling', () => {
    // ByteDance advise against prompts past ~600 English words and warn that overloaded briefs drop
    // instructions. That is advice about quality, not a documented limit on what is read — the same
    // distinction that keeps Midjourney null, and the reason null must not drift into meaning zero.
    expect(readPromptBudget('anything', 'SEEDREAM')).toBeNull();
  });

  it('measures a character budget in characters, not in estimated tokens', () => {
    // OpenAI states its Images API limit in characters, so that is the unit it is compared in —
    // running it through the token estimator would quietly divide the prompt by four.
    const prompt = 'a'.repeat(1_000);
    const reading = readPromptBudget(prompt, 'GPT_IMAGE');

    expect(reading?.budget.unit).toBe('characters');
    expect(reading?.used).toBe(1_000);
    expect(reading?.isOver).toBe(false);
  });

  it('reports a character budget as exceeded once the text is genuinely longer', () => {
    const reading = readPromptBudget('a'.repeat(32_001), 'GPT_IMAGE');
    expect(reading?.isOver).toBe(true);
  });

  it('measures a token budget against the app’s own estimate', () => {
    // Stable Diffusion's CLIP context is 77 tokens; the estimator is ~4 characters per token.
    const shortPrompt = 'a'.repeat(40); // ~10 tokens
    const reading = readPromptBudget(shortPrompt, 'STABLE_DIFFUSION');

    expect(reading?.budget.limit).toBe(77);
    expect(reading?.budget.unit).toBe('tokens');
    expect(reading?.used).toBe(10);
    expect(reading?.isOver).toBe(false);
  });

  it('reports being over, and by how much', () => {
    const longPrompt = 'a'.repeat(77 * 4 * 3); // ~231 tokens, three times the ceiling
    const reading = readPromptBudget(longPrompt, 'STABLE_DIFFUSION');

    expect(reading?.isOver).toBe(true);
    expect(reading?.overBy).toBeCloseTo(3, 5);
  });

  it('does not call a prompt exactly at the ceiling over it', () => {
    const exact = 'a'.repeat(77 * 4);
    const reading = readPromptBudget(exact, 'STABLE_DIFFUSION');

    expect(reading?.used).toBe(77);
    expect(reading?.isOver).toBe(false);
    expect(reading?.overBy).toBe(1);
  });

  it('carries a note saying what imposes the ceiling', () => {
    // A limit with no stated cause is not actionable: 77 tokens is the text encoder's context, not
    // an API refusal, and the two call for different responses from the user.
    expect(readPromptBudget('x', 'STABLE_DIFFUSION')?.budget.note).toMatch(/CLIP text-encoder/i);
    // Not "T5": FLUX.2 encodes with Mistral ([dev]) or Qwen3 ([klein]) and has no CLIP stage, so a
    // note naming T5 would be describing FLUX.1 — which is how this row went stale the first time.
    expect(readPromptBudget('x', 'FLUX')?.budget.note).toMatch(/inference code/i);
    expect(readPromptBudget('x', 'FLUX')?.budget.note).not.toMatch(/T5 text-encoder/i);
  });
});

describe('the app’s own output against the ceilings it now records', () => {
  const prompt = generatePrompt('CHARACTER', DEFAULT_PRESET.subject, {
    ...DEFAULT_PRESET.output,
    targetModel: 'STABLE_DIFFUSION',
  });

  it('is far past what a CLIP encoder reads, which is the whole reason this exists', () => {
    // Not a contrived case: this is the app's default studio state. The prompt is a specification
    // of a couple of thousand words, and the target reads the first seventy-seven tokens of it.
    const reading = readPromptBudget(prompt, 'STABLE_DIFFUSION');

    expect(reading?.isOver).toBe(true);
    expect(reading?.overBy).toBeGreaterThan(10);
  });
});

describe('every target answers', () => {
  it('returns a budget or null for each id, and never throws', () => {
    for (const target of TARGET_MODEL_IDS) {
      const budget = promptBudgetFor(target);
      if (budget === null) continue;
      expect(budget.limit, target).toBeGreaterThan(0);
      expect(['characters', 'tokens'], target).toContain(budget.unit);
      expect(budget.note.length, target).toBeGreaterThan(0);
    }
  });
});
