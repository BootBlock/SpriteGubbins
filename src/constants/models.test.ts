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
 * rather than silence. `null` is a target with no published *ceiling* — a vendor who states none, no
 * vendor at all, or a vendor who publishes advice instead — where there is no claim about fitting to
 * make.
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
  // ByteDance publish advice rather than a ceiling, so there is nothing here to fit *inside*: past
  // 600 English words Seedream reads the whole brief and drops detail out of the sheet. The entry's
  // description says that, and `PromptBudgetNotice` measures it — this table does not, because a fit
  // claim is a claim about the prompt arriving.
  SEEDREAM: null,
  // The entry this file was written for. 4,500 tokens holds the sparse end of the library and not
  // the default five-view sheet, and the description names that trade-off.
  QWEN_IMAGE: 'SOME',
  // Midjourney publish no figure anywhere in their documentation. See `models.ts` for how far that
  // search went, which is the half a bare absence cannot state.
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
      expect(declared, `${model.id} has no published ceiling, so there is no fit to declare`).toBeNull();
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

describe('what each target model says about its own prompt length', () => {
  it.each(TARGET_MODELS)('$id records why its budget is the state it is', (model) => {
    // The half a `null` could never carry, and the reason the four states exist: an entry with no
    // figure has to say whether the vendor published none or whether there is no vendor to have
    // published one — and either way it has to read as a finding rather than as a field nobody
    // filled in. The Seedream entry spent its life asserting the opposite of its own description
    // because an empty value could not be told from an unanswered question.
    const budget = model.capabilities.promptBudget;
    const note = budget.note.trim();

    // A note behind a figure names its cause in a phrase, and is rendered as one. A note standing in
    // *place* of a figure is the record of the search, so it owes the reader a sentence's worth.
    const floor = 'limit' in budget ? 20 : 60;
    expect(note.length, `${model.id} states too little about its prompt budget`).toBeGreaterThan(floor);
    expect(note, `${model.id}'s budget note is not a sentence`).toMatch(/[.!?]$/);
    // The same rule the guidance copy follows, and for the same reason: a note behind a figure is
    // rendered under the studio's notice, in a bundle whose every other string is typographic.
    expect(note, `${model.id}'s budget note carries a straight apostrophe`).not.toMatch(/'/);
    expect(note, `${model.id}'s budget note carries a straight double quote`).not.toMatch(/"/);
  });

  it('measures a prompt against a figure only where one was published', () => {
    // The claim the states are for. `GENERIC` names no vendor and Midjourney's publishes no figure,
    // so nothing may be measured against either and the studio shows nothing for them; every other
    // target carries a number, and Seedream's is advice rather than a ceiling.
    const kinds = new Map(TARGET_MODELS.map((model) => [model.id, model.capabilities.promptBudget.kind]));

    expect(kinds.get('GENERIC')).toBe('NO_VENDOR');
    expect(kinds.get('MIDJOURNEY')).toBe('UNPUBLISHED');
    expect(kinds.get('SEEDREAM')).toBe('GUIDANCE');
    expect([...kinds].filter(([, kind]) => kind === 'CEILING').map(([id]) => id)).toEqual([
      'CHATGPT_5_6_SOL',
      'GEMINI_FLASH_IMAGE',
      'GEMINI_PRO_IMAGE',
      'QWEN_IMAGE',
      'STABLE_DIFFUSION',
      'FLUX',
      'FLUX_API',
      'GPT_IMAGE',
    ]);
  });
});
