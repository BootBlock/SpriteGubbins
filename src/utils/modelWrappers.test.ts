import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { MIDJOURNEY_VERSION, TARGET_MODELS } from '../constants/models.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import {
  CATEGORY_ASSEMBLY,
  LETTERING_IS_A_COMPONENT,
  RENDER_STYLE_SURFACE,
} from '../constants/promptText/index.ts';
import { NATIVE_GRID_HEADING } from '../constants/promptTemplate.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { RENDER_STYLES } from '../types/rendering.ts';
import type { RenderStyle } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { wrapForSeedream, wrapForSol } from './modelWrapperText/index.ts';
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
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

const SPECIFICATION = '# MODULAR SPRITE-SHEET SPECIFICATION';

/**
 * A configuration whose section 2 carries a native grid, which is what the Sol tests below need.
 *
 * Four of the five fields are `nativeGridScale`'s gate — a pixel-art style, the `CUSTOM` profile and
 * a size that parses, on a canvas that seats the components at a multiple above 1 — and
 * `targetModel` is what puts Sol's wrapper round the result. The four are the Stardew Valley style
 * reference's own settings, which is the look the traced run asked for.
 *
 * **The category the tests pair it with is an ICON, not the character every other fixture here
 * uses**, because a native grid is derived from a *component* size and no CHARACTER plan states one:
 * that category's components are the parts of a figure, and the size a reader states for such a
 * sheet is the figure they assemble into. See `utils/componentTargetSize.ts`. An ICON narrows every
 * direction set to `SINGLE_FRONT`, so its twenty-eight components come out at 5× on this square
 * canvas whatever `DEFAULT_OUTPUT_CONFIG` names.
 */
const NATIVE_GRID_SHEET = {
  targetModel: 'CHATGPT_5_6_SOL',
  renderStyle: 'PIXEL_ART',
  resolutionProfile: 'CUSTOM',
  spriteTargetSize: '16 × 32 px',
  aspectRatio: 'SQUARE_1_1',
} as const satisfies Partial<OutputConfig>;

/** The wrapper alone: whatever the target added before the specification, and after it. */
function wrapperOnly(prompt: string): string {
  const start = prompt.indexOf(SPECIFICATION);
  const end = prompt.lastIndexOf('Generate the sheet now.');
  if (start === -1 || end === -1) throw new Error('the compiled prompt should carry the template.');
  return `${prompt.slice(0, start)}\n${prompt.slice(end)}`;
}

/**
 * The `--no` flag's entries, split the way Midjourney documents them — on the comma, so a two-word
 * entry stays one entry. Asserting the flag line as a string instead is what lets `cast shadow`
 * satisfy a check written to forbid `shadow`.
 */
function negatedByMidjourney(
  renderStyle: RenderStyle,
  category: SubjectCategory = 'CHARACTER',
): readonly string[] {
  const prompt = generatePrompt(
    category,
    defaultSubjectFor(category),
    withOutput({ targetModel: 'MIDJOURNEY', renderStyle }),
  );
  const flag = /--no ([^\n]+)/.exec(prompt);
  return flag?.[1]?.split(', ') ?? [];
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

  it('leaves GPT Image unwrapped, since OpenAI document no rewrite on the path it is sent along', () => {
    // It carried the retired DALL·E 3 entry's directive prefix, justified by "the mainline model …
    // will automatically revise your prompt for improved performance" — which OpenAI state for the
    // image generation tool *in the Responses API* and for nothing else. This target is the Images
    // API, whose own guide documents no revision, and the reason the two were ever confused is that
    // the entry linked to ChatGPT: that surface is the Sol entry, and `constants/models.ts` now says
    // so. With no documented rewrite there was nothing for terse absolute phrasing to survive, so
    // the prefix went with the claim rather than outliving it.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GPT_IMAGE' }));

    expect(prompt.startsWith('# MODULAR SPRITE-SHEET SPECIFICATION')).toBe(true);
    expect(prompt.endsWith('Generate the sheet now.')).toBe(true);
  });

  it('gives Midjourney flags, without the two that did nothing', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'MIDJOURNEY' }));
    expect(prompt).toContain('--ar 16:9');
    expect(prompt).toContain('--s 50');
    // `--sw` is style-reference weight and does nothing without an accompanying `--sref`.
    expect(prompt).not.toContain('--sw');
    // Raw mode beside the version that takes it: the flag is `--raw` on the V8 line this pins and
    // `--style raw` on V7, and the two were out of step until it was checked. Asserted adjacent to
    // `MIDJOURNEY_VERSION` because that is the pairing — either half moving alone is the defect.
    expect(prompt).toContain(`${MIDJOURNEY_VERSION} --raw`);
    expect(prompt).not.toContain('--style');
  });

  it('stops excluding a frame on the one category whose components are frames', () => {
    // Section 0 forbids a frame or border "around the image or around a component", which is
    // annotation. An entry in `--no` names a thing to avoid and never a placement — a limit no
    // entry width gets round, unlike the one `cast shadow` answers — so on an INTERFACE
    // sheet the flag would suppress the panel edges section 4 asks for — the same judgement that
    // already keeps `background` out of the list. Both directions are asserted, because a wrapper
    // that dropped the terms for everyone would pass a one-sided check.
    const character = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'MIDJOURNEY' }));
    expect(character).toMatch(/--no[^\n]*\bframe, border\b/);

    const kit = PRESETS.find((preset) => preset.category === 'INTERFACE');
    if (!kit) throw new Error('an INTERFACE preset should ship.');
    const interfaceSheet = generatePrompt(
      'INTERFACE',
      kit.subject,
      withOutput({ ...kit.output, targetModel: 'MIDJOURNEY' }),
    );
    expect(interfaceSheet).toMatch(/--no[^\n]*text, labels/);
    expect(interfaceSheet).not.toMatch(/--no[^\n]*\bframe\b/);
    expect(interfaceSheet).not.toMatch(/--no[^\n]*\bborder\b/);
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
    // was the one sentence guaranteed to be cut. Asserted for both tiers, which reach the same
    // placement from different directions: the 512-token ceiling decides it for the weights, and
    // Black Forest Labs' word-order guidance decides it for the hosted tier.
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

  it('sends Seedream the self-audit but never the component map', () => {
    // The capability split in one place: it reasons over the brief, so the audit is actionable —
    // and it returns an image and nothing else, so the map would be an instruction it can only
    // drop. `emitComponentMap` is set here to prove the gate is the capability, not the default.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'SEEDREAM', emitComponentMap: true }),
    );
    expect(prompt).toContain('## 9. LAYOUT AND SELF-AUDIT');
    expect(prompt).not.toContain('COMPANION COMPONENT MAP');
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

  it('adds section 2’s native grid to what Sol may not shorten, under its own heading', () => {
    // The omission this pins was measured rather than reasoned about. Sol composes its own ~700-word
    // prompt for the image tool, and on a traced run the three blocks this wrapper named all arrived
    // intact while section 2's native-grid block — which it did not name — was compressed to "at
    // least 7x" and lost both of its checkable sentences. The sheet came back with no native pixel
    // grid in it at all.
    const prompt = generatePrompt('ICON', defaultSubjectFor('ICON'), withOutput(NATIVE_GRID_SHEET));

    expect(wrapperOnly(prompt)).toContain(
      `Shorten nothing in:\n\n- the block headed “${NATIVE_GRID_HEADING}”`,
    );
  });

  it('quotes a heading section 2 actually carries', () => {
    // The wrapper points Sol at a block by name, so a heading reworded in the template without the
    // pointer following it would leave the directive naming something that is not there — which
    // reads as an instruction rather than as a fault, and is exactly how this failed the first time.
    // Both sides take the one constant; this is what stops the substitution being quietly undone.
    const prompt = generatePrompt('ICON', defaultSubjectFor('ICON'), withOutput(NATIVE_GRID_SHEET));

    expect(prompt).toContain(`### ${NATIVE_GRID_HEADING}`);
  });

  it('adds a pinned palette to the same list, whichever way that palette states its colours', () => {
    // Same run, same mechanism, one step short of measured: Sol compressed section 2's colour
    // *budget* into "Use a restrained 32-64 colour palette total", so a shortened rendering of
    // section 2's colour material is observed.
    //
    // Both palette kinds, because `PaletteSpace` is a union and the entry has to be true of both: a
    // `FIXED` palette emits a list of hex entries, a `CHANNEL_DEPTH` one emits a ladder and no list
    // at all, and ten of the nineteen are the second kind. An entry naming "the exact colours" would
    // point at something more than half of them do not carry — the same fault as naming an absent
    // block, reached from inside a block that is present.
    for (const palette of ['GAME_BOY_DMG', 'SNES'] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ ...NATIVE_GRID_SHEET, palette }));

      expect(wrapperOnly(prompt), palette).toContain('- every value in the palette block');
    }
  });

  it('names the palette on a sheet that has no native grid, so the two flags stay distinct', () => {
    // Without this the flags are indistinguishable from one shared boolean: every other case runs
    // with the native grid on, so wiring `palette` to `nativeGrid` by mistake would pass them all.
    // A painted sheet pins a palette and has no grid, which is the one combination that separates
    // them.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        targetModel: 'CHATGPT_5_6_SOL',
        renderStyle: 'PAINTED_2D',
        palette: 'GAME_BOY_DMG',
      }),
    );
    const wrapper = wrapperOnly(prompt);

    expect(wrapper).toContain('- every value in the palette block');
    expect(wrapper).not.toContain(NATIVE_GRID_HEADING);
  });

  it('says nothing about section 2 where section 2 states no figures', () => {
    // The clause names blocks, so it can only be written where they were emitted. A painted sheet
    // with no palette pinned has nothing in section 2 to protect, and a sentence introducing an empty
    // list is the "repeated statement" OpenAI's own guidance for this family says to cut.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'CHATGPT_5_6_SOL', renderStyle: 'PAINTED_2D', palette: 'FREE' }),
    );

    expect(wrapperOnly(prompt)).not.toContain('Section 2 states figures as well');
  });

  it('does not tell a ChatGPT user about a rewrite OpenAI documents only for the API', () => {
    // `revised_prompt` and "the mainline model … will automatically revise your prompt" are stated
    // for the Responses API. No OpenAI page says ChatGPT's own image surface does the same — and
    // pasting into ChatGPT is the path this app's users are on, so an earlier draft asserted the
    // API's documented behaviour to a surface it was not documented for. The hand-off itself is
    // certain on both paths; the rewrite is not, so the wrapper claims only the hand-off.
    //
    // Swept over both shapes the wrapper has, because the studio's opening configuration produces
    // the shorter one: its `HIGH_RESOLUTION` profile states its own scale, so there is no native grid
    // and the section 2 clause never appears. Checking that alone left the guard silent on every
    // configuration the clause is actually written into — and the first draft of that clause said
    // "a paraphrase keeps the idea", which this would not have caught.
    for (const overrides of [{ targetModel: 'CHATGPT_5_6_SOL' } as const, NATIVE_GRID_SHEET]) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput(overrides));
      const wrapper = prompt.slice(0, prompt.indexOf('# MODULAR SPRITE-SHEET SPECIFICATION'));

      expect(wrapper).not.toMatch(/rewrite|revise|paraphrase|summaris/i);
      // What replaces it names the mechanism both paths do share.
      expect(wrapper).toContain('a GPT Image model');
    }
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

  it('cites the section each wrapper names, at the number that section landed on', () => {
    // The drift this closes was latent rather than live: the numerals were hand-written into the two
    // wrappers, and every section they name is unconditional and declared before the first
    // conditional one, so all five were right. Nothing held them there — a section inserted before
    // the inventory moves the prompt body's own citations and would have left these behind, in the
    // two wrappers whose whole job is saying which blocks may not be shortened.
    const sol = generatePrompt('ICON', defaultSubjectFor('ICON'), withOutput(NATIVE_GRID_SHEET));
    const seedream = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'SEEDREAM' }));

    // The prompt's own heading is the answer both halves are held to, read back out of the compiled
    // text rather than restated here — which is what makes this an agreement check and not a second
    // hand-written copy of the same five numbers.
    const headingNumber = (prompt: string, title: string): string => {
      const heading = new RegExp(String.raw`^## (\d+)\. ${title}$`, 'm').exec(prompt);
      if (!heading?.[1]) throw new Error(`the compiled prompt should carry a heading for ${title}.`);
      return heading[1];
    };
    const cites = (prompt: string, title: string, sentence: (number: string) => string): void => {
      expect(wrapperOnly(prompt), title).toContain(sentence(headingNumber(prompt, title)));
    };

    cites(sol, 'NON-NEGOTIABLE OUTPUT CONTRACT', (n) => `must still carry section ${n},`);
    cites(sol, 'PROJECTION, CAMERA AND OBJECT ORIENTATION', (n) => `yaws in section ${n} `);
    cites(sol, 'COMPONENT INVENTORY', (n) => `the inventory in section ${n} `);
    cites(sol, 'RENDER STYLE', (n) => `Section ${n} states figures as well`);
    cites(seedream, 'NON-NEGOTIABLE OUTPUT CONTRACT', (n) => `stated in section ${n} `);
  });

  it('moves a wrapper citation with the heading it names', () => {
    // What the check above cannot show on its own: today every one of those sections is at the
    // number it has always been at, so an assertion over the shipped prompt passes against a
    // hand-written numeral just as well as against a derived one. These two call the wrappers
    // directly with a map whose headings sit one lower, which no configuration this app offers can
    // produce — and a numeral written down rather than derived fails here.
    const shifted = new Map([
      ['PREFACE', 0],
      ['CONTRACT', 1],
      ['SUBJECT', 2],
      ['STYLE', 3],
      ['CAMERA', 4],
      ['INVENTORY', 5],
    ]);

    expect(wrapForSol('body', true, true, shifted)).toContain(
      'still carry section 1, the object\nyaws in section 4 and the inventory in section 5',
    );
    expect(wrapForSol('body', true, true, shifted)).toContain('Section 3 states figures as well');
    expect(wrapForSeedream('body', shifted)).toContain('precedence order stated in section 1');
  });

  it('throws rather than citing a section the prompt does not carry', () => {
    // The same refusal `applySectionNumbers` makes for a `[SEC:…]`, applied to the wrappers' half of
    // the citation: `section undefined` in front of a model reads as prose and would ship.
    expect(() => wrapForSeedream('body', new Map([['STYLE', 2]]))).toThrow(/CONTRACT/);
  });

  it('has a selector entry for every wrapped model, and no more', () => {
    expect(TARGET_MODELS.map((model) => model.id).sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });
});

/**
 * The wrapper against section 2 of the prompt it wraps.
 *
 * The defect: `wrapForFlux`, `wrapForStableDiffusion` and `wrapForQwen` stated the edge and gradient
 * rules as fixed strings, and those are the *pixel-art* rules — the template emits them only under
 * `[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]`. So a painted sheet asked for "soft blended forms"
 * in section 2 and had blending weighted against it in the same prompt, and on Flux the wrong claim
 * led the prompt, where the vendor's own guidance says attention is highest.
 *
 * Driven over the compiled prompt for every render style on every target, because the two halves
 * being compared are both in the text the user copies — and each half was right on its own.
 */
describe('what a wrapper says about the surface', () => {
  /** Every term any style's entry can contribute, which is the pool a wrong style draws from. */
  const EVERY_SURFACE_TERM = [
    ...new Set(RENDER_STYLES.flatMap((style) => RENDER_STYLE_SURFACE[style].negatives)),
  ];

  /** The three that take a negative channel, and therefore state every term the style permits. */
  const NEGATES = ['MIDJOURNEY', 'STABLE_DIFFUSION', 'QWEN_IMAGE'] as const;

  it.each(RENDER_STYLES)('negates nothing %s requires, on any target', (renderStyle) => {
    const permitted = RENDER_STYLE_SURFACE[renderStyle].negatives;
    const forbidden = EVERY_SURFACE_TERM.filter((term) => !permitted.includes(term));

    for (const targetModel of TARGET_MODEL_IDS) {
      const wrapper = wrapperOnly(
        generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel, renderStyle })),
      );
      for (const term of forbidden) {
        expect(wrapper, `${targetModel} / ${renderStyle}`).not.toContain(term);
      }
      // And the terms the style does permit are stated, on every target that has somewhere to state
      // them. Without this half the suite would pass on an entry whose `negatives` had been emptied
      // — the whole matrix is derived from the record, so it can only ever catch a term the record
      // does not hold.
      if (NEGATES.includes(targetModel as (typeof NEGATES)[number])) {
        for (const term of permitted) {
          expect(wrapper, `${targetModel} / ${renderStyle}`).toContain(term);
        }
      }
      // The two the wrappers used to state unconditionally, in the wording they stated it in.
      expect(wrapper, `${targetModel} / ${renderStyle}`).not.toContain('crisp hard edges');
      expect(wrapper, `${targetModel} / ${renderStyle}`).not.toContain('no shadows');
    }
  });

  it('still carries the pixel rules where they belong, in both negative blocks', () => {
    // The other direction, which a one-sided check would pass by dropping the terms for everyone —
    // the failure the `frame, border` test above is written against too.
    for (const targetModel of ['STABLE_DIFFUSION', 'QWEN_IMAGE'] as const) {
      const pixel = generatePrompt(
        'CHARACTER',
        SUBJECT,
        withOutput({ targetModel, renderStyle: 'PIXEL_ART' }),
      );
      expect(pixel, targetModel).toContain('anti-aliased edges');
      expect(pixel, targetModel).toContain('smooth gradients');

      const painted = generatePrompt(
        'CHARACTER',
        SUBJECT,
        withOutput({ targetModel, renderStyle: 'PAINTED_2D' }),
      );
      expect(painted, targetModel).not.toContain('anti-aliased edges');
      expect(painted, targetModel).not.toContain('smooth gradients');
    }
  });

  it('tells Flux the style section 2 would have told it past its ceiling', () => {
    // Flux's is the leading sentence and the only statement of the style an open-weight encoder
    // reaches, so the style has to be *in* it rather than merely absent from it.
    for (const renderStyle of RENDER_STYLES) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'FLUX', renderStyle }));
      expect(prompt, renderStyle).toContain(
        `Every part is drawn ${RENDER_STYLE_SURFACE[renderStyle].statement}.`,
      );
      // Ahead of the specification, which is the whole reason the statement is here.
      expect(prompt.indexOf('Every part is drawn'), renderStyle).toBeLessThan(prompt.indexOf(SPECIFICATION));
    }
  });

  it('keeps Midjourney’s two unqualified terms off the style that requires them', () => {
    // `--no shadow` and `--no gradient` are the same defect in the fourth wrapper: bare, they take
    // the form shadow and the material shading `RENDERED_3D` asks for. `shadow` qualifies to the
    // placement section 0 forbids; `gradient` cannot, because the qualifier it needs is the one word
    // this list may never carry — so it becomes the style's own claim or nothing.
    expect(negatedByMidjourney('RENDERED_3D')).toEqual(['text', 'labels', 'cast shadow', 'frame', 'border']);
    expect(negatedByMidjourney('PIXEL_ART')).toEqual([
      'text',
      'labels',
      'cast shadow',
      'blurred edges',
      'anti-aliased edges',
      'smooth gradients',
      'frame',
      'border',
    ]);
  });

  it('reads each Midjourney negative as one whole entry, as `--no` is documented to', () => {
    // The resolved answer this pins, in place of the hedge it replaces: a `--no` entry is one
    // multi-prompt segment at -0.5, and `::` rather than the space is what divides one concept from
    // the next, so a two-word entry is read whole by the model that draws the sheet. That is what
    // makes `cast shadow` a qualification rather than a wash — it has to survive as *one* entry,
    // because the bare term it replaces is a substring of it and is exactly what a check on the
    // whole flag line would miss.
    //
    // Swept over every render style and every category, because the list is assembled from three
    // per-configuration sources — the style's surface terms and the frame gate either side of it —
    // and each of the rules below is a claim about the whole configuration space rather than about
    // the default one.
    for (const category of SUBJECT_CATEGORIES) {
      for (const renderStyle of RENDER_STYLES) {
        const entries = negatedByMidjourney(renderStyle, category);
        const where = `${category} / ${renderStyle}`;

        expect(entries, where).toContain('cast shadow');
        expect(entries, where).not.toContain('shadow');
        expect(entries, where).not.toContain('gradient');
        // The standing rule of this list, which no configuration may reach around: the sheet is
        // built on a keyable background, and losing it is the one failure here that cannot be
        // recovered from. Matched as a substring of each entry rather than as a whole word, because
        // `backgrounds` and `gradient-background` carry the term as surely as the bare noun does.
        //
        // The width is precautionary and settled as such, not a reading of the flag: an entry is
        // read whole, so `gradient background` would not negate the background — but what makes it
        // atomic is `::` rather than the space dividing concepts, which no page current for the
        // pinned version restates.
        //
        // What keeps it out is the cost of that being wrong, not a claim that the other entries are
        // safe decomposed — none of the four multi-word entries is. `blurred edges` decomposes to a
        // bare `edges` on the styles that assert a hard one, and that returns a sheet softer than it
        // was asked for, which can simply be generated again. This one returns a sheet that cannot
        // be keyed, which is the whole point of the sheet. Degraded is survivable; useless is not.
        for (const entry of entries) {
          expect(entry, `${where} / ${entry}`).not.toMatch(/background/i);
        }
      }
    }
  });

  it('spends the anatomy negatives on the sheets that have limbs, and no others', () => {
    // `extra limbs, merged limbs` names a duplication failure only a limbed subject can have. It was
    // in both negative blocks on every category, including the ones whose components are floor
    // tiles, panel frames and effect frames.
    //
    // The four that keep it are named here rather than read back out of `LIMBS_ARE_COMPONENTS`,
    // because a test that derives its expectation from the record under test would pass whatever the
    // record said. Two are worth stating in as many words. VEHICLE's pools offer `Walker / Mech` and
    // `Articulated Walker Legs`, so a third leg is a failure that sheet really can have. PORTRAIT's
    // `Framing & Crop` reaches `Full Body Standing`, and even its shortest crop carries shoulders —
    // a half-body bust with three hands is the same duplication wearing a different subject.
    const LIMBED = ['CHARACTER', 'CREATURE', 'VEHICLE', 'PORTRAIT'];

    for (const targetModel of ['STABLE_DIFFUSION', 'QWEN_IMAGE'] as const) {
      for (const category of SUBJECT_CATEGORIES) {
        const prompt = generatePrompt(category, defaultSubjectFor(category), withOutput({ targetModel }));
        const where = `${targetModel} / ${category}`;

        if (LIMBED.includes(category)) {
          expect(prompt, where).toContain('extra limbs, merged limbs');
        } else {
          expect(prompt, where).not.toContain('extra limbs');
          expect(prompt, where).not.toContain('merged limbs');
        }
      }
    }
  });
});

/**
 * The wrapper against the *subject* of the prompt it wraps.
 *
 * The defect: all three channels that can state an assembly failure stated a **figure's** —
 * `(assembled character:1.3), (posed figure:1.3)` opening Stable Diffusion's block, `assembled
 * character, posed figure, complete figure` opening Qwen's, and `no assembled figure` closing Flux's
 * leading sentence — on every category. Every sheet has an assembled-whole failure and only two of
 * them have it in a figure's vocabulary, so on the other seven the highest-weighted term in the
 * block named something the sheet could not contain and the claim it exists to make went unmade.
 *
 * Walked over `SUBJECT_CATEGORIES` rather than sampled, because the category is the axis this
 * drifts on: a tenth category is a compile error in the record and would otherwise be a silent pass
 * here.
 */
describe('what a wrapper says about the assembled whole', () => {
  /** The three targets with a channel for it — two negative blocks, and Flux's leading prose. */
  const SAYS_IT = ['STABLE_DIFFUSION', 'QWEN_IMAGE', 'FLUX'] as const;
  const NEGATES = ['STABLE_DIFFUSION', 'QWEN_IMAGE'] as const;

  /** Every term and every clause any category can contribute — the pool a wrong category draws from. */
  const EVERY_TERM = [
    ...new Set(SUBJECT_CATEGORIES.flatMap((category) => CATEGORY_ASSEMBLY[category].negatives)),
  ];
  const EVERY_STATEMENT = [
    ...new Set(SUBJECT_CATEGORIES.map((category) => CATEGORY_ASSEMBLY[category].statement)),
  ];

  it.each(SUBJECT_CATEGORIES)('names %s’s own assembly failure and no other category’s', (category) => {
    const { negatives, statement } = CATEGORY_ASSEMBLY[category];
    // Shared entries are subtracted rather than assumed absent: OBJECT and VEHICLE both fail as a
    // `product shot`, and CHARACTER and CREATURE keep the figure pair and its clause between them.
    const foreignTerms = EVERY_TERM.filter((term) => !negatives.includes(term));
    const foreignStatements = EVERY_STATEMENT.filter((clause) => clause !== statement);
    const subject = defaultSubjectFor(category);

    for (const targetModel of NEGATES) {
      const wrapper = wrapperOnly(generatePrompt(category, subject, withOutput({ targetModel })));
      for (const term of negatives) expect(wrapper, `${targetModel} / ${category}`).toContain(term);
    }

    // Flux's is prose and leads the prompt, so its clause is checked where it actually lands —
    // closing the first sentence — rather than merely somewhere in the wrapper. `no text` drops out
    // on the one category whose components are lettering, which is the same conditional the two
    // negative blocks apply to their own `text` entries — so the expected sentence is built from
    // `LETTERING_IS_A_COMPONENT` rather than fixed, and asserts the *absence* on that category
    // rather than skipping it.
    const flux = generatePrompt(category, subject, withOutput({ targetModel: 'FLUX' }));
    const lettering = LETTERING_IS_A_COMPONENT[category];
    expect(flux.startsWith('The sheet shows only disconnected individual parts on a'), category).toBe(true);
    expect(flux, category).toContain(
      lettering ? `no cast shadow and ${statement}.` : `no cast shadow, no text, and ${statement}.`,
    );

    // And nothing anywhere in any of the three says another category's failure. Both halves are
    // walked on all three targets, because the failure being guarded against is a wrapper reading a
    // record it was not handed the category for.
    for (const targetModel of SAYS_IT) {
      const wrapper = wrapperOnly(generatePrompt(category, subject, withOutput({ targetModel })));
      const where = `${targetModel} / ${category}`;
      for (const term of foreignTerms) expect(wrapper, `${where} / ${term}`).not.toContain(term);
      for (const clause of foreignStatements) expect(wrapper, `${where} / ${clause}`).not.toContain(clause);
    }
  });

  it('weights the terms for Stable Diffusion and states them flat for Qwen', () => {
    // The one thing about these two blocks that is the *channel's* rather than the sheet's, and the
    // reason the record holds bare terms. `(term:1.3)` is an Automatic1111/compel convention those
    // front-ends parse before the model sees it; Qwen documents `negative_prompt` as taking a
    // description, so a weight would arrive there as literal punctuation.
    for (const category of SUBJECT_CATEGORIES) {
      const subject = defaultSubjectFor(category);
      const sd = generatePrompt(category, subject, withOutput({ targetModel: 'STABLE_DIFFUSION' }));
      const qwen = generatePrompt(category, subject, withOutput({ targetModel: 'QWEN_IMAGE' }));

      for (const term of CATEGORY_ASSEMBLY[category].negatives) {
        expect(sd, `${category} / ${term}`).toContain(`(${term}:1.3)`);
        expect(qwen, `${category} / ${term}`).not.toContain(`(${term}:`);
      }
      // Every weighted term in the block is an assembly term, which is what stops the run growing
      // to swallow the shadow and surface terms below it.
      expect(
        [...sd.matchAll(/\(([^():]+):1\.3\)/g)].map((match) => match[1]),
        category,
      ).toEqual([...CATEGORY_ASSEMBLY[category].negatives]);
    }
  });

  it('keeps the figure vocabulary on the two categories that have a figure', () => {
    // The claim the whole record is for, stated in the words that shipped rather than read back out
    // of the record under test — which would pass whatever the record said. Both directions, because
    // a change that dropped the terms for everyone would satisfy a one-sided check, and CHARACTER
    // and CREATURE were never the two that needed fixing.
    const FIGURE = ['assembled character', 'posed figure', 'assembled figure'];
    const FIGURED = ['CHARACTER', 'CREATURE'];

    for (const category of SUBJECT_CATEGORIES) {
      for (const targetModel of SAYS_IT) {
        const wrapper = wrapperOnly(
          generatePrompt(category, defaultSubjectFor(category), withOutput({ targetModel })),
        );
        const where = `${targetModel} / ${category}`;
        const said = FIGURE.filter((term) => wrapper.includes(term));

        // Each target carries part of the vocabulary rather than all of it — Flux's clause says
        // "assembled figure" where the two negative blocks say the other pair — so the positive half
        // asserts that some of it survives on the two that own it.
        if (FIGURED.includes(category)) expect(said, where).not.toEqual([]);
        else expect(said, where).toEqual([]);
      }
    }
  });
});

/**
 * The negative channels' half of the same contradiction, which is wider than the prompt body's.
 *
 * `text`, `labels` and `captions` are things to avoid on twelve categories and the subject itself on
 * the thirteenth, and a negative channel names a thing rather than a placement — the limit
 * `FRAME_IS_A_COMPONENT` was introduced for, arriving at four wrappers instead of one. Flux carries
 * `no text` in its leading sentence, which is the strongest position in the prompt on either tier —
 * by the 512-token ceiling on the weights, and by Black Forest Labs' word-order guidance on the
 * hosted one — so on a glyph set it would spend that position negating the sheet.
 *
 * **The two terms that stay are what makes this a boundary rather than a hole.** A watermark and a
 * signature are not characters of a font, so no reading of the exemption reaches them, and a signed
 * sheet is as spoilt as any other. They are asserted present on every category, in both blocks that
 * carry them, alongside the terms that drop.
 */
describe('what a wrapper says about text', () => {
  /** The three terms that name the subject of a glyph set, and where each is carried. */
  const DROPS = [
    { targetModel: 'STABLE_DIFFUSION', terms: ['text', 'labels'] },
    { targetModel: 'QWEN_IMAGE', terms: ['text', 'labels', 'captions'] },
  ] as const;

  /** The two that are annotation whatever the sheet draws, in the blocks that already carried them. */
  const KEEPS = ['watermark', 'signature'] as const;

  it.each(SUBJECT_CATEGORIES)('drops the subject-naming terms for %s only where they are it', (category) => {
    const subject = defaultSubjectFor(category);
    const lettering = LETTERING_IS_A_COMPONENT[category];

    for (const { targetModel, terms } of DROPS) {
      // Split on the comma the way both blocks join them, so `cast shadow` cannot satisfy a check
      // written for `shadow` — the reason `negatedByMidjourney` above does the same.
      const block = wrapperOnly(generatePrompt(category, subject, withOutput({ targetModel })))
        .split(/[,\n]/)
        .map((entry) =>
          entry
            .replace(/^Negative prompt:/, '')
            .trim()
            .replace(/\.$/, ''),
        );
      const where = `${targetModel} / ${category}`;

      for (const term of terms) expect(block.includes(term), `${where} / ${term}`).toBe(!lettering);
      for (const term of KEEPS) expect(block, `${where} / ${term}`).toContain(term);
    }

    // Midjourney's flag is the same claim through `--no`, parsed by the helper this file already has.
    const flagged = negatedByMidjourney('PIXEL_ART', category);
    for (const term of ['text', 'labels']) {
      expect(flagged.includes(term), `MIDJOURNEY / ${category} / ${term}`).toBe(!lettering);
    }

    // And Flux, whose claim is prose in the leading sentence rather than a term in a list.
    const flux = generatePrompt(category, subject, withOutput({ targetModel: 'FLUX' }));
    expect(flux.includes('no cast shadow, no text,'), `FLUX / ${category}`).toBe(!lettering);
  });
});
