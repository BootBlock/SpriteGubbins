import { describe, expect, it } from 'vitest';
import { measurePromptFit } from '../test/promptFit.ts';
import type { PromptFit } from '../test/promptFit.ts';
import type { TargetModelId } from '../types/output.ts';
import { TARGET_MODELS } from './models.ts';

/**
 * What each target's description is allowed to say about length.
 *
 * `TARGET_MODELS[].description` is rendered under the selector, so it is the reader's stated reason
 * for choosing one — and several of the entries make a claim about how much of the specification the
 * target will read. That is a claim about this app's own output, and it can be measured; the Qwen
 * entry's was wrong from the day it was written, and said the opposite of what the studio's own
 * budget notice said on the same screen.
 *
 * So the sentence is written from this table rather than from an impression, and the table is
 * checked against measurement. `ALL` means every configuration the app composes unprompted fits
 * inside {@link MAX_BUDGET_SHARE} of the ceiling and a description may say so outright; `SOME` means
 * a lean sheet fits and a five-view one does not, which is a trade-off the sentence has to name;
 * `NONE` means nothing the app composes fits, and the description owes the reader that finding
 * rather than silence. `null` is a vendor who publishes no ceiling, where there is nothing to claim.
 *
 * **What this cannot check is the words**, and pretending otherwise would need a phrase list that
 * goes stale faster than the claim does. What it does is make the claim's *ground* move visibly: a
 * template that grows past a ceiling fails here, naming the entry whose sentence has to change.
 */
const DECLARED_FIT: Record<TargetModelId, PromptFit | null> = {
  GENERIC: null,
  CHATGPT_5_6_SOL: 'ALL',
  GEMINI_FLASH_IMAGE: 'ALL',
  GEMINI_PRO_IMAGE: 'ALL',
  SEEDREAM: null,
  // The entry this file was written for. 4,500 tokens holds the sparse end of the library and not
  // the default five-view sheet, and the description names that trade-off.
  QWEN_IMAGE: 'SOME',
  MIDJOURNEY: null,
  // CLIP's 77-token window, against a shortest prompt of roughly 3,100 estimated tokens.
  STABLE_DIFFUSION: 'NONE',
  FLUX: 'NONE',
  FLUX_API: 'ALL',
  // 32,000 *characters*, which the largest sheets come within a few hundred of — so this is `SOME`
  // on the same slack argument every other row uses, not because anything is truncated today.
  GPT_IMAGE: 'SOME',
};

describe('what each target model will actually read', () => {
  it.each(TARGET_MODELS)('$id fits what its description claims it fits', (model) => {
    const reading = measurePromptFit(model.id);
    const declared = DECLARED_FIT[model.id];

    if (reading === null) {
      expect(declared, `${model.id} publishes no ceiling, so there is no fit to declare`).toBeNull();
      return;
    }

    expect(
      reading.fit,
      `${model.id} declares ${String(declared)} but measures ${reading.fit}: the library runs ` +
        `${String(reading.smallest)}–${String(reading.largest)} ${reading.budget.unit} against an ` +
        `allowance of ${String(reading.allowance)}. Rewrite the entry's description in models.ts, ` +
        `then this table.`,
    ).toBe(declared);
  });

  it('declares a fit for every target the studio offers', () => {
    // The `Record` type already obliges every id to appear; this catches the other direction, where
    // a target is removed from the table but not from the selector.
    expect(Object.keys(DECLARED_FIT).sort()).toEqual(TARGET_MODELS.map((model) => model.id).sort());
  });
});
