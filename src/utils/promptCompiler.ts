import { PROMPT_TEMPLATE } from '../constants/promptTemplate.ts';
import {
  CATEGORY_ASSEMBLY,
  FRAME_IS_A_COMPONENT,
  LETTERING_IS_A_COMPONENT,
  LIMBS_ARE_COMPONENTS,
  RENDER_STYLE_SURFACE,
  BACKGROUND_KEY_TEXT,
} from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { wrapForModel } from './modelWrappers.ts';
import { promptConditions } from './promptConditions.ts';
import { sheetFacts } from './promptFacts.ts';
import { promptValues } from './promptValues.ts';
import {
  applyConditionals,
  applyNumbering,
  applyOptionals,
  applySectionNumbers,
  assertBlocksResolved,
  resolveCitations,
  sectionNumbers,
  substitute,
} from './templateEngine.ts';

/**
 * Compile the studio's state into the prompt the user copies.
 *
 * A pure function of its three arguments: the same state always produces the same text, which is
 * what lets the preview derive it during render (with `useMemo`) instead of mirroring it into state
 * through an effect — the anti-pattern the specification bans first.
 *
 * **A cleared field omits its line entirely.** v1 emitted `` Species / Archetype: `DEFINED` `` on the
 * reasoning that an empty backtick pair looks like an authoring mistake. That weighed two options
 * and missed the third: `DEFINED` is a *content-shaped token in the highest-weighted section of the
 * prompt*, and a generator reading it either ignores the line or treats "DEFINED" as a descriptor to
 * satisfy. Absence says "you decide" precisely, costs no tokens, and cannot be misread — and the
 * template states that rule outright, so absence is unambiguous rather than merely silent.
 */
export function generatePrompt(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): string {
  // What this configuration is a sheet of, resolved once — see `promptFacts.ts` for why almost
  // nothing below reads a stored field directly.
  const facts = sheetFacts(category, subject, output);

  // Which of the template's blocks survive, which is what the numbering and every citation are
  // then resolved against.
  const config = promptConditions(category, output, facts);

  // The conditioned template, and the number each of its surviving headings lands on. Three sets of
  // citations resolve against that one answer — the prompt body's own, which `applySectionNumbers`
  // reads below; the app-authored values, through `cite`; and the model wrappers, which cite
  // sections in text added after the markers are gone. Any of them deriving its own is how a section
  // added anywhere moves one set and leaves the others behind.
  const conditioned = applyConditionals(PROMPT_TEMPLATE, config);
  const numbers = sectionNumbers(conditioned);
  const cite = (text: string): string => resolveCitations(numbers, text);

  // Every token the template substitutes, cited over on the app's own half and never on the
  // reader's — see `promptValues.ts`, which is where that boundary lives.
  const values = promptValues(category, subject, output, facts, cite);

  // Blocks, then sections, then optionals, then numbering, then substitution — see
  // `templateEngine.ts` for why that order. The first of those ran above, because the values had to
  // be cited against the headings it leaves standing; what follows is the rest of it. Sections are
  // numbered from those same survivors, which is what closes the gap the rig section used to leave
  // behind it. The marker check sits *before* substitution: afterwards the text carries whatever the
  // user typed, and a subject named `Robot [IF:X] guard` is an odd name rather than a broken template.
  const sections = applySectionNumbers(conditioned, numbers);
  const resolved = applyNumbering(applyOptionals(sections, values));
  assertBlocksResolved(resolved);
  const prompt = substitute(resolved, values);

  return wrapForModel(prompt, output.targetModel, {
    aspectRatio: output.aspectRatio,
    backgroundKeyDescription: BACKGROUND_KEY_TEXT[output.backgroundKey],
    frameIsAComponent: FRAME_IS_A_COMPONENT[category],
    letteringIsAComponent: LETTERING_IS_A_COMPONENT[category],
    surface: RENDER_STYLE_SURFACE[output.renderStyle],
    limbsAreComponents: LIMBS_ARE_COMPONENTS[category],
    assembly: CATEGORY_ASSEMBLY[category],
    // The same two answers `promptConditions` gave the template's own gates, so a wrapper can never
    // name a block the prompt it wraps does not carry.
    nativeGrid: facts.nativeScale !== null,
    palette: facts.palette !== null,
    // The headings' own numbers, from the same walk that resolved the prompt body's citations — so a
    // wrapper naming a section cannot come to name a different one than the prose does.
    sectionNumbers: numbers,
  });
}
