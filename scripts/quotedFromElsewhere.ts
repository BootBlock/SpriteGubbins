/**
 * The quotations in comments under `src/` that are deliberately on none of the pages their comment
 * cites, each with the reason, for `check-vendor-quotes.ts`.
 *
 * An entry is a claim that the words are *meant* to be absent from those pages: a sentence a page
 * used to carry and the comment records as gone, this repository's own wording earlier or now, what
 * a generator returned, a figure third parties repeat, or a phrase the comment coins. A vendor
 * sentence the comment presents as on its page and that is not there is stale, and belongs in a fix
 * rather than here. The script reports an entry a page carries again, and
 * `tests/vendor-quotes.test.ts` fails for an entry no comment still quotes, so this list cannot
 * outlive the quotations it excuses.
 *
 * Keyed by the quotation exactly as the comment writes it, so a reworded quotation is checked again.
 */
const GONE = 'The cited page used to carry this sentence, and the comment records that it no longer does.';
const EARLIER = 'This repository’s own earlier wording, quoted as what a change corrected or replaced.';
const OURS = 'This repository’s own current wording, quoted where the comment discusses it.';
const OUTPUT = 'What a generator returned in a measured run, or a report of it, quoted as evidence.';
const ELSEWHERE = 'A figure third parties repeat, quoted to say that the vendor does not state it.';
const COINED = 'A phrase the comment defines, or weighs and rejects, in its own voice.';

export const QUOTED_FROM_ELSEWHERE: Readonly<Record<string, string>> = {
  // Sentences the cited pages used to carry.
  'is always a GPT Image model': GONE,
  'the tool handles GPT Image model selection': GONE,
  'The model used for the image generation process is always a GPT Image model, including `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`':
    GONE,
  'repeated statements of the same rule': GONE,
  'process instructions for behavior the model already performs reliably': GONE,
  'GPT-5-class models follow prompt contracts closely': GONE,

  // This repository's earlier comments, descriptions, prompt lines and wrappers.
  'is `--raw` on the V8 line and `--style raw` on V7': EARLIER,
  'puts you on a thinking tier': EARLIER,
  'raise the reasoning level': EARLIER,
  'released 21 July 2026': EARLIER,
  'carried no weights and no API pricing, so this is the only place a reader can use it at all': EARLIER,
  '*not* on the API reference, which states no length for either `text` or `negative_prompt`': EARLIER,
  'generally available': EARLIER,
  'in limited early access': EARLIER,
  'is written for the hosted tier, and this entry is not it': EARLIER,
  'addresses no open weight in any of its advice': EARLIER,
  'are open weights you run yourself, so there is no vendor page that generates with them': EARLIER,
  "Black Forest Labs' playground generates with the hosted tier": EARLIER,
  'Age / Vitality': EARLIER,
  'Anatomy base': EARLIER,
  'Head & sensory features': EARLIER,
  'a backdrop keeps every rule a component keeps': EARLIER,
  'pick one feature the subject carries on one side and not the other — its **chirality witness** — and trace that one feature through every view':
    EARLIER,
  'Components are the exception': EARLIER,
  'leave it out': EARLIER,
  'object yaw 0°': EARLIER,
  'turned off it because the piece reads better that way': EARLIER,
  'no ink at all': EARLIER,
  'which advises no open weight anywhere': EARLIER,
  'the one vendor page that says it outright is written for the hosted one': EARLIER,
  'roughly 3,600 tokens': EARLIER,
  'crisp hard edges': EARLIER,
  'No shadows': EARLIER,
  'no assembled figure': EARLIER,
  'renamed the flag with the V8 line': EARLIER,
  'not restated anywhere current': EARLIER,
  'the mechanism is established in both directions': EARLIER,
  'as they are written here': EARLIER,
  'never those three': EARLIER,
  'High reasoning effort': EARLIER,
  blurry: EARLIER,

  // This repository's current prompt, wrappers and comments.
  'across 27 real GPT-5.6 Sol sheets': OURS,
  'front-ends that chunk the prompt': OURS,
  'also serve [klein] from their own API': OURS,
  'fully transparent alpha': OURS,
  uniform: OURS,
  'no gradient, texture, vignette': OURS,
  'the key colour': OURS,
  'where section [SEC:SUBJECT] names such a feature without saying which side carries it': OURS,
  'this sheet does not choose one': OURS,
  'leave the element out **of the image** entirely': OURS,
  'no cast shadow': OURS,
  'no drop shadow': OURS,
  'around the image or around a component': OURS,
  'around a component': OURS,
  'material shading and soft form shadow': OURS,
  'each logical native pixel must appear as one solid square block of identical delivered pixels': OURS,
  'no feature, contour, marking, material detail, or colour boundary may be finer than one native pixel':
    OURS,
  'red, green and blue each take one of 32 levels — 0, 8, 16, … 255': OURS,
  'The piece sizes in section [SEC:RIG] are a native pixel grid': OURS,
  '6× or more': OURS,
  'Say so rather than resolving it': OURS,
  'never sees anything but what survived the hand-off': OURS,
  'never anything in that list': OURS,
  'the object yaws': OURS,
  'Satisfy this section before any aesthetic consideration': OURS,
  'soft blended forms': OURS,

  // What generators returned.
  'far more interior detail than a true 16 × 32 sprite could contain': OUTPUT,
  'crisp enlarged pixels, no antialiasing': OUTPUT,
  'enlarged by a whole-number multiple (at least 7x)': OUTPUT,
  'crisp nearest-neighbour blocky pixels': OUTPUT,
  'Use a restrained 32-64 colour palette total': OUTPUT,

  // Figures third parties repeat.
  '4.5× longer': ELSEWHERE,
  '6,000 characters': ELSEWHERE,

  // Phrases the comments coin.
  'already overruled': COINED,
  'resolves to ink': COINED,
  'act on': COINED,
  'redraw rather than delivering': COINED,
  'every check below': COINED,
};
