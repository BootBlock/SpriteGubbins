import type { TargetModelId } from '../types/output.ts';
import { QWEN_NEGATIVE_BLOCK, STABLE_DIFFUSION_NEGATIVE_BLOCK } from './modelWrapperText/index.ts';

/**
 * What opens the block each target takes in a request field of its own, or `null` where the whole
 * wrapped prompt goes into the one prompt field.
 *
 * A record rather than a check on two ids, so a target added to the union is a compile error here
 * until somebody answers whether its wrapper writes such a block.
 */
const SEPARATE_FIELD_BLOCK: Readonly<Record<TargetModelId, string | null>> = {
  GENERIC: null,
  CHATGPT_5_6_SOL: null,
  GEMINI_FLASH_IMAGE: null,
  GEMINI_PRO_IMAGE: null,
  SEEDREAM: null,
  QWEN_IMAGE: QWEN_NEGATIVE_BLOCK,
  MIDJOURNEY: null,
  STABLE_DIFFUSION: STABLE_DIFFUSION_NEGATIVE_BLOCK,
  FLUX: null,
  FLUX_API: null,
  GPT_IMAGE: null,
};

/**
 * The text a target reads in its prompt field: the wrapped prompt, less the trailing block its wrapper
 * writes for a separate request field (audit finding T4).
 *
 * The budget notice measures this, because a vendor's figure is for the field it names: Alibaba's
 * 4.5K tokens are `text`'s and CLIP's 77 are the positive prompt's, and the negative block goes into a
 * field of its own on both. Counting it put prompts past a ceiling they were inside.
 */
export function promptFieldText(prompt: string, target: TargetModelId): string {
  const block = SEPARATE_FIELD_BLOCK[target];
  if (block === null) return prompt;
  const at = prompt.lastIndexOf(`\n\n${block}`);
  return at === -1 ? prompt : prompt.slice(0, at);
}
