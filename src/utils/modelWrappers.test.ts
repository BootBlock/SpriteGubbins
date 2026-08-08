import { describe, expect, it } from 'vitest';
import { MIDJOURNEY_VERSION, TARGET_MODELS } from '../constants/models.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * The wrappers differ in *kind*, not in wording — a reasoning contract, command flags, a negative
 * block, a directive prefix — so each test here pins the thing that would make the wrapper wrong for
 * its target rather than merely differently worded.
 *
 * Driven through `generatePrompt` rather than `wrapForModel` directly, because what matters is the
 * text the user actually copies.
 */
const SUBJECT = DEFAULT_PRESET.subject;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_PRESET.output, ...overrides };
}

describe('wrapForModel', () => {
  it.each(TARGET_MODEL_IDS)('%s still carries the template', (targetModel) => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));
    expect(prompt).toContain('## 0. NON-NEGOTIABLE OUTPUT CONTRACT');
  });

  it('leaves the generic prompt unwrapped', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GENERIC' }));
    expect(prompt.startsWith('# MODULAR SPRITE-SHEET SPECIFICATION')).toBe(true);
    expect(prompt.endsWith('Generate the sheet now.')).toBe(true);
  });

  it('gives Midjourney flags, without the two that did nothing', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'MIDJOURNEY' }));
    expect(prompt).toContain('--ar 16:9');
    expect(prompt).toContain('--s 50');
    // `--sw` is style-reference weight and does nothing without an accompanying `--sref`.
    expect(prompt).not.toContain('--sw');
    // Excluding "background" would risk losing the key colour the sheet is built around.
    expect(prompt).not.toMatch(/--no[^\n]*background/);
    // Raw mode beside the version that takes it: the flag is `--raw` on the V8 line this pins and
    // `--style raw` on V7, and the two were out of step until it was checked. Asserted adjacent to
    // `MIDJOURNEY_VERSION` because that is the pairing — either half moving alone is the defect.
    expect(prompt).toContain(`${MIDJOURNEY_VERSION} --raw`);
    expect(prompt).not.toContain('--style');
  });

  it('gives Flux prose rather than a negative block it would discard', () => {
    const flux = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'FLUX' }));
    expect(flux).not.toContain('Negative prompt:');
    expect(flux).toContain('no assembled figure');

    const sd = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'STABLE_DIFFUSION' }));
    expect(sd).toContain('Negative prompt:');
    expect(sd).toContain('(assembled character:1.3)');
  });

  it('names the chosen background key in the Flux restatement', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'FLUX', backgroundKey: 'PURE_BLACK' }),
    );
    expect(prompt).toContain('on a flat pure black #000000 field');
  });

  it('puts the Flux restatement where a 512-token encoder will actually reach it', () => {
    // The defect this pins: appended, the restatement sat ~3,600 tokens into a prompt an open-weight
    // Flux stops reading at 512, so the one sentence written to cover Flux's missing negative prompt
    // was the one sentence guaranteed to be cut. Asserted for both tiers — Black Forest Labs' own
    // word-order guidance applies to the hosted one too.
    for (const targetModel of ['FLUX', 'FLUX_API'] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));
      expect(prompt.startsWith('The sheet shows only disconnected individual parts'), targetModel).toBe(true);
    }
  });

  it('gives Qwen an unweighted negative block, not Stable Diffusion’s', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'QWEN_IMAGE' }));
    expect(prompt).toContain('Negative prompt:');
    expect(prompt).toContain('assembled character');
    // `(term:1.3)` is an Automatic1111/compel convention those front-ends parse before the model
    // sees it. Qwen documents `negative_prompt` as taking a description, so weights would arrive as
    // literal punctuation.
    expect(prompt).not.toMatch(/\(assembled character:[\d.]+\)/);
  });

  it('tells Seedream what to sacrifice, and tells nobody else', () => {
    const seedream = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'SEEDREAM' }));
    expect(seedream.startsWith('Plan the grid and the per-component cells before rendering')).toBe(true);
    expect(seedream).toContain('drop surface detail first');

    // The instruction is answering a failure ByteDance document for this model. On a target that
    // truncates by position, or one that reads the whole prompt, it would be noise.
    for (const targetModel of ['GENERIC', 'FLUX', 'QWEN_IMAGE', 'GPT_IMAGE'] as const) {
      const other = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));
      expect(other, targetModel).not.toContain('drop surface detail first');
    }
  });

  it('sends Seedream the self-audit but never the manifest', () => {
    // The capability split in one place: it reasons over the brief, so the audit is actionable —
    // and it returns an image and nothing else, so the manifest would be an instruction it can
    // only drop. `emitManifest` is set here to prove the gate is the capability, not the default.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'SEEDREAM', emitManifest: true }),
    );
    expect(prompt).toContain('## 9. LAYOUT AND SELF-AUDIT');
    expect(prompt).not.toContain('## 10. COMPANION MANIFEST');
  });

  it('tells Sol that what its tool call carries is what gets drawn', () => {
    // The one fact about this target the template cannot know: `gpt-5.6-sol` outputs text only and
    // reaches an image through a *tool*, whose far side is "always a GPT Image model". So the
    // rendered sheet comes from whatever that call carries, not from this specification.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'CHATGPT_5_6_SOL' }));

    expect(prompt.startsWith('[DIRECTIVE — HAND-OFF TO THE IMAGE TOOL]')).toBe(true);
    expect(prompt).toContain('You are not the model that draws this sheet');
    // Naming the three parts is the point — a bare "do not summarise" gives it nothing to protect
    // when it does have to shorten something.
    expect(prompt).toContain('section 0, the object\nyaws in section 3 and the inventory in section 4');
  });

  it('does not tell a ChatGPT user about a rewrite OpenAI documents only for the API', () => {
    // `revised_prompt` and "the mainline model … will automatically revise your prompt" are stated
    // for the Responses API. No OpenAI page says ChatGPT's own image surface does the same — and
    // pasting into ChatGPT is the path this app's users are on, so an earlier draft asserted the
    // API's documented behaviour to a surface it was not documented for. The hand-off itself is
    // certain on both paths; the rewrite is not, so the wrapper claims only the hand-off.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'CHATGPT_5_6_SOL' }));
    const wrapper = prompt.slice(0, prompt.indexOf('# MODULAR SPRITE-SHEET SPECIFICATION'));

    expect(wrapper).not.toMatch(/rewrite|revise|paraphrase|summaris/i);
    // What replaces it names the mechanism both paths do share.
    expect(wrapper).toContain('a GPT Image model');
  });

  it('states nothing in the Sol wrapper that the template already states', () => {
    // OpenAI's guidance for this family lists "repeated statements of the same rule" and "process
    // instructions for behavior the model already performs reliably" among what to remove, and warns
    // that conflicting rules destabilise a GPT-5-class model more than missing detail does. Each
    // line below was in the wrapper and is a restatement of a heading the template carries.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'CHATGPT_5_6_SOL' }));

    // Reasoning effort is a request parameter, not something a line of prose sets.
    expect(prompt).not.toContain('High reasoning effort');
    expect(prompt).not.toContain('Treat section 0 as a hard done-condition');
    expect(prompt).not.toContain('Plan the grid and the per-component bounding boxes');
    // Section 0 and section 9 say these for themselves, and are what the wrapper used to point at.
    expect(prompt).toContain('Satisfy this section before any aesthetic consideration.');
    expect(prompt).toContain('Before delivering, verify:');
  });

  it('gives the hand-off to Sol alone, since no other target has one', () => {
    for (const targetModel of TARGET_MODEL_IDS) {
      if (targetModel === 'CHATGPT_5_6_SOL') continue;
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));
      expect(prompt, targetModel).not.toContain('You are not the model that draws this sheet');
    }
  });

  it('has a selector entry for every wrapped model, and no more', () => {
    expect(TARGET_MODELS.map((model) => model.id).sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });
});
