import { describe, expect, it } from 'vitest';
import type { TargetModelId } from '../types/output.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';
import { alphaDeliveryFor } from '../utils/targetCapabilities.ts';
import { backgroundKeyNote } from './backgroundKeyNote.ts';
import { backgroundKeysFor, resolveBackgroundKey } from './backgroundKeysFor.ts';
import { defaultSubjectFor } from './categories/index.ts';
import { TARGET_MODELS } from './models.ts';
import { DEFAULT_OUTPUT_CONFIG } from './output/index.ts';

/**
 * That `TRANSPARENT` is offered only to a target that can return an alpha channel (audit finding T1).
 *
 * Asked for alpha, a target whose vendor documents none paints a checkerboard or a flat matte where the
 * transparency should be, and the Quantise tab has nothing to key out — so the key is withdrawn, the
 * prompt compiles on the first key still offered, and the control says why.
 */
const SUBJECT = defaultSubjectFor('ICON');
const WITHOUT_ALPHA = TARGET_MODELS.filter((model) => model.capabilities.alpha.kind === 'UNDOCUMENTED');
const WITH_ALPHA: readonly TargetModelId[] = ['GENERIC', 'CHATGPT_5_6_SOL', 'GPT_IMAGE'];

describe('the TRANSPARENT key against the target', () => {
  it('declares alpha for OpenAI’s two surfaces alone, and withdraws nothing on behalf of no vendor', () => {
    expect(TARGET_MODELS.filter((model) => !WITHOUT_ALPHA.includes(model)).map((model) => model.id)).toEqual(
      WITH_ALPHA,
    );
    expect(alphaDeliveryFor('GENERIC').kind).toBe('NO_VENDOR');
    expect(alphaDeliveryFor('CHATGPT_5_6_SOL').kind).toBe('TOOL_CALL');
    expect(alphaDeliveryFor('GPT_IMAGE').kind).toBe('REQUEST_PARAMETER');
  });

  it.each(WITHOUT_ALPHA.map((model) => model.id))('withdraws TRANSPARENT from %s', (target) => {
    expect(backgroundKeysFor(SUBJECT, target)).not.toContain('TRANSPARENT');
    expect(resolveBackgroundKey(SUBJECT, target, 'TRANSPARENT')).toBe('MAGENTA_FF00FF');
    expect(backgroundKeyNote(SUBJECT, target, 'MAGENTA_FF00FF')).toBe(
      'This target model documents no transparent output for a prompt, so TRANSPARENT is not offered.',
    );
  });

  it.each(WITH_ALPHA)('offers TRANSPARENT to %s', (target) => {
    expect(backgroundKeysFor(SUBJECT, target)).toContain('TRANSPARENT');
  });

  it('compiles a stored TRANSPARENT key on Midjourney as the magenta key', () => {
    const prompt = generatePrompt('ICON', SUBJECT, {
      ...DEFAULT_OUTPUT_CONFIG,
      targetModel: 'MIDJOURNEY',
      backgroundKey: 'TRANSPARENT',
    });
    expect(prompt).not.toContain('fully transparent alpha');
    expect(prompt).toContain('#FF00FF');
  });

  it('tells a GPT Image reader to ask for alpha in the request, only while the key is TRANSPARENT', () => {
    expect(backgroundKeyNote(SUBJECT, 'GPT_IMAGE', 'TRANSPARENT')).toContain('background to “transparent”');
    expect(backgroundKeyNote(SUBJECT, 'GPT_IMAGE', 'MAGENTA_FF00FF')).toBe('');
    expect(backgroundKeyNote(SUBJECT, 'GENERIC', 'TRANSPARENT')).toBe('');
  });

  it('tells Sol to set the image tool’s background option, and only Sol', () => {
    const compile = (targetModel: TargetModelId) =>
      generatePrompt('ICON', SUBJECT, {
        ...DEFAULT_OUTPUT_CONFIG,
        targetModel,
        backgroundKey: 'TRANSPARENT',
      });
    const request = 'set the image\ntool’s `background` option to `transparent`';
    expect(compile('CHATGPT_5_6_SOL')).toContain(request);
    expect(compile('GPT_IMAGE')).not.toContain(request);
    expect(
      generatePrompt('ICON', SUBJECT, { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'CHATGPT_5_6_SOL' }),
    ).not.toContain(request);
  });
});
