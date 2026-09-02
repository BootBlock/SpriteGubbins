import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';
import { describeOverage, describeUsage, readPromptBudget } from './promptBudget.ts';
import { promptBudgetFigureFor } from './targetCapabilities.ts';
import { TARGET_MODELS } from '../constants/models.ts';
import { countWords } from './promptMetrics.ts';

/**
 * A ceiling nobody publishes and a ceiling of zero must not be confused, and neither must be
 * confused with "fits". These decide what the studio tells the user about a prompt it has already
 * composed, so a wrong answer here is worse than none.
 */

describe('readPromptBudget', () => {
  it('returns null where nobody published a figure to measure against', () => {
    // Null means *unstated*, not unlimited — the preview shows nothing rather than a reassuring
    // tick. Two targets earn it, for two different reasons the entries now state separately:
    // Midjourney's vendor documents no prompt length at all, and Generic names no vendor to have
    // documented one.
    expect(readPromptBudget('anything', 'MIDJOURNEY')).toBeNull();
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

  it('measures Seedream against its published advice, and keeps it marked as advice', () => {
    // The defect this whole file was re-cut for. ByteDance state 600 English words on the `prompt`
    // parameter itself and document what happens past it — information scattered, details dropped —
    // and the entry carried `null`, which is the value that switches the studio's notice off. So the
    // one target whose own description says long briefs lose instructions was the one target that
    // could never say so.
    //
    // It stays `GUIDANCE`, because ByteDance do not say the brief is cut: `PromptBudgetNotice` reads
    // that and words the finding as lost detail rather than as a prompt that will not arrive.
    const brief = 'word '.repeat(700);
    const reading = readPromptBudget(brief, 'SEEDREAM');

    expect(reading?.budget.kind).toBe('GUIDANCE');
    expect(reading?.budget.limit).toBe(600);
    expect(reading?.budget.unit).toBe('words');
    expect(reading?.used).toBe(700);
    expect(reading?.isOver).toBe(true);
  });

  it('counts words exactly, and does not hedge a count it did not estimate', () => {
    // A word budget is measured with the preview's own counter, so the figure is the count itself —
    // the `~` belongs to the token estimator alone. Hedging every unit that was not `characters`
    // would have put one in front of this the moment `words` existed.
    const brief = 'a brief of exactly eight separate little words';
    const reading = readPromptBudget(brief, 'SEEDREAM');

    expect(reading?.used).toBe(countWords(brief));
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(describeUsage(reading)).toBe('8 words');
    expect(describeUsage(reading)).not.toContain('~');
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

/**
 * What the studio actually prints. Both of these existed as expressions inside the notice's JSX,
 * where neither could be tested — and both were wrong in the same direction: they stated a precision
 * the number underneath did not have.
 */
describe('describeUsage', () => {
  it('marks a token count as an estimate, because that is what it is', () => {
    const reading = readPromptBudget('a'.repeat(400), 'STABLE_DIFFUSION');
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(describeUsage(reading)).toBe('~100 tokens');
  });

  it('does not mark a character count as an estimate, because it is counted', () => {
    // `prompt.length` is the figure itself. A `~` here disclaims a precision the reading has, which
    // is the same fault as claiming one it hasn't — and it shipped that way on every GPT Image
    // reading, the one target whose ceiling is published in characters.
    const reading = readPromptBudget('a'.repeat(32_500), 'GPT_IMAGE');
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(describeUsage(reading)).toBe('32500 characters');
    expect(describeUsage(reading)).not.toContain('~');
  });
});

describe('describeOverage', () => {
  it('states the excess near the ceiling, where a multiplier says nothing', () => {
    // One token past Qwen's 4,500. `Math.round(overBy)` was `1` here, printed as "1× over" — which
    // is both uninformative and, read plainly, says the prompt is the same size as the ceiling.
    const reading = readPromptBudget('a'.repeat(4_501 * 4), 'QWEN_IMAGE');
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(reading.used).toBe(4_501);
    expect(describeOverage(reading)).toBe('over by ~1');
  });

  it('keeps distinguishing two prompts that a multiplier rounded together', () => {
    // The failure this replaces: everything from 1× to 1.5× rendered identically. These two are
    // 1,999 tokens apart and must not read the same.
    const justOver = readPromptBudget('a'.repeat(4_501 * 4), 'QWEN_IMAGE');
    const farther = readPromptBudget('a'.repeat(6_500 * 4), 'QWEN_IMAGE');
    expect(justOver).not.toBeNull();
    expect(farther).not.toBeNull();
    if (justOver === null || farther === null) return;

    expect(describeOverage(justOver)).not.toBe(describeOverage(farther));
    expect(describeOverage(farther)).toBe('over by ~2000');
  });

  it('states the excess through the band a multiplier rounds *up*, not just the band it flattens', () => {
    // The half of the defect that is not "1× over": from 1.5× `Math.round` starts answering, but it
    // answers coarsely. 1.6× past Qwen's ceiling rendered "2× over", overstating by a quarter — so
    // this band is the one where the old and new phrasings differ without either being degenerate,
    // and nothing else in this file reaches it.
    const reading = readPromptBudget('a'.repeat(7_200 * 4), 'QWEN_IMAGE');
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(reading.overBy).toBeCloseTo(1.6, 5);
    expect(describeOverage(reading)).toBe('over by ~2700');
  });

  it('switches to a multiplier once one carries more than the excess', () => {
    // Exactly twice the ceiling is the handover point, and the multiplier is right from there on:
    // "58× over" is what a full specification aimed at a CLIP encoder actually means.
    const doubled = readPromptBudget('a'.repeat(77 * 4 * 2), 'STABLE_DIFFUSION');
    const wayOver = readPromptBudget('a'.repeat(77 * 4 * 58), 'STABLE_DIFFUSION');
    expect(doubled).not.toBeNull();
    expect(wayOver).not.toBeNull();
    if (doubled === null || wayOver === null) return;

    expect(describeOverage(doubled)).toBe('~2× over');
    expect(describeOverage(wayOver)).toBe('~58× over');
  });

  it('counts a character overage in characters, and does not hedge it', () => {
    // The unit follows the budget, not the target: this one is not divided by four on the way out,
    // so unlike every case above it carries no `~`. The excess of an exact count is exact.
    const reading = readPromptBudget('a'.repeat(32_050), 'GPT_IMAGE');
    expect(reading).not.toBeNull();
    if (reading === null) return;

    expect(describeOverage(reading)).toBe('over by 50');
    expect(describeOverage(reading)).not.toContain('~');
  });

  it('hedges a token overage, because the excess of an estimate is an estimate', () => {
    // The finding this pass added: `describeUsage` marked `used` as estimated and `describeOverage`
    // then subtracted it from the limit and printed the result bare — as though the *difference*
    // between an estimate and an exact figure were exact. It is the number a user acts on, and at
    // ~4,501 estimated tokens the true count could sit either side of the ceiling.
    const tokens = readPromptBudget('a'.repeat(9_000 * 4), 'QWEN_IMAGE');
    expect(tokens).not.toBeNull();
    if (tokens === null) return;

    expect(describeOverage(tokens)).toBe('~2× over');
    expect(describeOverage(tokens)).toContain('~');
  });
});

describe('the app’s own output against the ceilings it now records', () => {
  const prompt = generatePrompt('CHARACTER', DEFAULT_PRESET.subject, {
    ...DEFAULT_OUTPUT_CONFIG,
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
  const DECLARED = new Map(TARGET_MODELS.map((model) => [model.id, model.capabilities.promptBudget]));

  it('offers a figure exactly where the target declares one, and never throws', () => {
    // The narrowing every measurement in the app goes through, so it is worth pinning that it agrees
    // with the declaration rather than being a second opinion about it: a figure is offered for the
    // two states that carry one and withheld for the two that do not. Walking `TARGET_MODEL_IDS`
    // rather than the entries is what makes it a claim about the whole union — a target left out of
    // the table throws inside the lookup instead of being skipped.
    for (const target of TARGET_MODEL_IDS) {
      const declared = DECLARED.get(target);
      const figure = promptBudgetFigureFor(target);

      if (declared?.kind === 'CEILING' || declared?.kind === 'GUIDANCE') {
        expect(figure, target).not.toBeNull();
        expect(figure?.limit, target).toBeGreaterThan(0);
        expect(['characters', 'tokens', 'words'], target).toContain(figure?.unit);
      } else {
        expect(figure, target).toBeNull();
      }
    }
  });
});
