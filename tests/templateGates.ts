import { PROMPT_TEMPLATE } from '../src/constants/promptTemplate.ts';

/**
 * `PROMPT_TEMPLATE` walked line by line, with every line knowing which section it sits in and which
 * `[IF:…]` blocks enclose it.
 *
 * The baseline-prompt document describes the template's structure in prose — "a clause in §0's
 * contract", "the rig check inside the self-audit" — and those claims are about *where* a gate sits,
 * which no rendered prompt shows. This is the reading that answers them.
 *
 * **The gate pattern is the one `applyConditionals` parses**, restated because the engine does not
 * export it. A restated pattern can drift from the one the engine reads, so the conventions suite
 * holds this walk to finding every `[IF:` the template writes: a fourth form the engine learned would
 * go unparsed here and fail that count rather than vanishing from every check that reads the walk.
 */

/** One `[IF:…]` marker. `operator` is empty for the bare truthy form. */
export interface Gate {
  readonly key: string;
  readonly operator: '' | '=' | '!=';
  readonly operands: string;
}

/** One line of the template, where it sits and what encloses it, outermost first. */
export interface TemplateLine {
  readonly text: string;
  /** The `[SECTION:…]` name of the nearest heading above, or empty before the first. */
  readonly section: string;
  readonly enclosing: readonly Gate[];
  /** The marker this line opens, where it opens one. */
  readonly gate: Gate | null;
}

const GATE_LINE = /^[ \t]*\[IF:([A-Z0-9_]+)(?:(!?=)([^\]]*))?\][ \t]*$/;
const END_GATE_LINE = /^[ \t]*\[\/IF\][ \t]*$/;
const SECTION_DECLARATION = /\[SECTION:([A-Z0-9_]+)\]\. (.*)$/;

function walk(template: string): readonly TemplateLine[] {
  const lines: TemplateLine[] = [];
  const open: Gate[] = [];
  let section = '';

  for (const text of template.split('\n')) {
    section = SECTION_DECLARATION.exec(text)?.[1] ?? section;
    const opening = GATE_LINE.exec(text);
    const operator = opening?.[2];
    const gate: Gate | null = opening
      ? {
          key: opening[1] ?? '',
          operator: operator === '=' || operator === '!=' ? operator : '',
          operands: opening[3] ?? '',
        }
      : null;

    lines.push({ text, section, enclosing: [...open], gate });
    if (gate !== null) open.push(gate);
    if (END_GATE_LINE.test(text)) open.pop();
  }

  return lines;
}

export const TEMPLATE_LINES = walk(PROMPT_TEMPLATE);

/** Every gate the template opens, with the line that opens it. */
export const TEMPLATE_GATES = TEMPLATE_LINES.filter(
  (line): line is TemplateLine & { readonly gate: Gate } => line.gate !== null,
);

/**
 * The template's section names in the order they are first declared, which is the numbering the
 * document writes: every section present, `CONTRACT` at 0. The rig and layout headings are each
 * declared twice from exclusive blocks, and count once.
 */
export const SECTION_ORDER: readonly string[] = [
  ...new Set(TEMPLATE_LINES.flatMap((line) => SECTION_DECLARATION.exec(line.text)?.[1] ?? [])),
];

/** The number the document gives a section, or throws for a name the template never declares. */
export function sectionNumber(name: string): number {
  const number = SECTION_ORDER.indexOf(name);
  if (number < 0) throw new Error(`The template declares no [SECTION:${name}].`);
  return number;
}

/** A section's heading text after its number — `COMPANION COMPONENT MAP`. */
export function sectionTitle(name: string): string {
  const title = TEMPLATE_LINES.map((line) => SECTION_DECLARATION.exec(line.text)).find(
    (match) => match?.[1] === name,
  )?.[2];
  if (title === undefined) throw new Error(`The template declares no [SECTION:${name}].`);
  return title;
}

/** Whether a line sits inside a block opened by the given marker. */
export function isInside(
  line: TemplateLine,
  key: string,
  operator: Gate['operator'] = '',
  operands = '',
): boolean {
  return line.enclosing.some(
    (gate) => gate.key === key && gate.operator === operator && gate.operands === operands,
  );
}
