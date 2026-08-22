/**
 * The five passes that turn the prompt template into a prompt, plus the guard that proves nothing
 * was left behind.
 *
 * Pure functions of their arguments — no state, no DOM — which is what lets the compiler stay a
 * pure function and the preview derive its output during render.
 *
 * **Run them in this order: conditionals, sections, optionals, numbering, then substitution.**
 * Conditionals go first so that optionals inside a dropped block are dropped with it, and so that
 * section numbering counts only the sections this prompt actually carries; list numbering follows
 * both, so a list item that was dropped never consumes a number; substitution goes last because an
 * optional line's text may itself contain a `[DEFINE:…]`, and substituting first would fill a token
 * on a line that is about to be removed.
 *
 * Every marker occupies a whole line, and removing one removes its line entirely. That is what keeps
 * a sparse subject — fifteen optional fields, most of them empty — from leaving a ladder of blank
 * lines behind, which is what makes a generated prompt look broken.
 */

/** `[IF:KEY]`, `[IF:KEY=A,B]` or `[IF:KEY!=A,B]`, alone on its line. */
const IF_LINE = /^[ \t]*\[IF:([A-Z0-9_]+)(?:(!?=)([^\]]*))?\][ \t]*$/;

const END_IF_LINE = /^[ \t]*\[\/IF\][ \t]*$/;

/**
 * `[OPTIONAL:NAME | line text]`, alone on its line.
 *
 * The body is matched greedily so it can contain its own `]` — which it routinely does, since the
 * text is usually `- Label: [DEFINE:NAME]`.
 */
const OPTIONAL_LINE = /^[ \t]*\[OPTIONAL:([A-Z0-9_]+)[ \t]*\|[ \t]?(.*)\][ \t]*$/;

const DEFINE_TOKEN = /\[DEFINE:([A-Z0-9_]+)\]/g;

/** `[N].` opening a list item, with whatever indentation precedes it. */
const NUMBERED_ITEM_LINE = /^([ \t]*)\[N\]\./;

/** `[SECTION:NAME]`, standing where a section heading's own number goes. */
const SECTION_DECLARATION = /\[SECTION:([A-Z0-9_]+)\]/g;

/** `[SEC:NAME]`, standing where prose cites one. */
const SECTION_REFERENCE = /\[SEC:([A-Z0-9_]+)\]/g;

/**
 * The block markers, which the first four passes must have consumed.
 *
 * `[DEFINE:…]` is deliberately absent: substitution runs last and rejects an unknown token itself,
 * and by then the text contains arbitrary user input. Scanning *that* for markers would make a
 * subject field of `Robot [IF:X] guard` throw out of the compiler.
 */
const RESIDUAL_BLOCK_MARKER = /\[(?:OPTIONAL|IF|SECTION|SEC):|\[\/IF\]|\[N\]/;

/** A value counts as set when it holds something other than whitespace. */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '';
}

/** Whether one `[IF:…]` marker's own condition holds, ignoring anything enclosing it. */
function conditionHolds(
  config: Readonly<Record<string, string>>,
  key: string,
  operator: string | undefined,
  operands: string | undefined,
): boolean {
  const value = config[key] ?? '';
  if (operator === undefined) return isSet(value);
  const matches = (operands ?? '').split(',').some((operand) => operand.trim() === value);
  return operator === '=' ? matches : !matches;
}

/**
 * Keep or drop each `[IF:…] … [/IF]` block.
 *
 * **Blocks nest**, hence the stack: a block inside a dropped block is dropped with it whatever its
 * own condition says. That is what lets a section state its precondition once and its parts state
 * theirs beneath it — the self-audit applies only to a target that can act on it, and
 * within it individual checks apply only to a cut-out rig or a pixel-art sheet. Flattening that
 * would mean naming each conjunction in the compiler, putting the template's logic where the
 * template cannot be read.
 *
 * An unclosed or unopened block throws: silently emitting the marker would put
 * `[IF:RIG_MODE=CUTOUT_RIG]` in front of the model as though it were an instruction.
 */
export function applyConditionals(template: string, config: Readonly<Record<string, string>>): string {
  const kept: string[] = [];
  // One frame per open block: its key, for the unclosed-block error, and whether its *own* condition
  // held. The conjunction lives in `keepingHere`, which is vacuously true at the top level — the
  // "no block open, so keep the line" case the flat version handled with a null check.
  const open: { readonly key: string; readonly keeping: boolean }[] = [];
  const keepingHere = () => open.every((block) => block.keeping);

  for (const line of template.split('\n')) {
    const opening = IF_LINE.exec(line);
    if (opening) {
      const [, key = '', operator, operands] = opening;
      // Evaluated even inside a dropped block, and then ignored: `keepingHere()` already answers
      // false, and short-circuiting here would make the result depend on evaluation order.
      open.push({ key, keeping: conditionHolds(config, key, operator, operands) });
      continue;
    }

    if (END_IF_LINE.test(line)) {
      if (open.length === 0) throw new Error('Prompt template: [/IF] with no matching [IF:…].');
      open.pop();
      continue;
    }

    if (keepingHere()) kept.push(line);
  }

  const unclosed = open[0];
  if (unclosed) throw new Error(`Prompt template: [IF:${unclosed.key}] was never closed.`);
  return kept.join('\n');
}

/**
 * Emit each `[OPTIONAL:NAME | …]` line's text, or remove the line when `NAME` is unset.
 *
 * Removing the line is the whole point: v1 emitted `Species / Archetype: \`DEFINED\`` for a cleared
 * field, putting a content-shaped token in the highest-weighted section of the prompt, where a model
 * either ignores it or treats "DEFINED" as a descriptor to satisfy. An absent line says "you decide"
 * precisely, costs no tokens, and cannot be misread.
 */
export function applyOptionals(template: string, values: Readonly<Record<string, string>>): string {
  const kept: string[] = [];

  for (const line of template.split('\n')) {
    const optional = OPTIONAL_LINE.exec(line);
    if (!optional) {
      kept.push(line);
      continue;
    }
    const [, name = '', body = ''] = optional;
    if (isSet(values[name])) kept.push(body);
  }

  return kept.join('\n');
}

/**
 * Number each `[N].` list item, counting from one and restarting at every blank line.
 *
 * **The template must not write the numerals itself, because its lists are assembled
 * conditionally.** The layout section's verification list carries a rig check and a pixel-art check
 * that appear independently, so hand-numbering them at 7 and 8 produced `…6. 8.` on a pixel-art sheet
 * without a cut-out rig — a checklist that skips a number reads as one whose seventh check went
 * missing, in the section whose whole job is to be worked through item by item. That list is itself
 * gated on the target deliberating, so the gap only ever reached a target that reads it; the same
 * trap is one conditional item away in section 0's contract, which every target gets.
 *
 * A blank line is what separates one list from the next; a continuation line is indented and carries
 * no marker, so it neither resets the count nor consumes a number. **Run this after the conditional
 * and optional passes** — a dropped item must not take a number with it — **and before
 * substitution**, since afterwards the text holds whatever the user typed into sixteen free-text
 * fields, and a subject named `[N]. guard` is an odd name rather than a list item.
 */
export function applyNumbering(template: string): string {
  let index = 0;

  return template
    .split('\n')
    .map((line) => {
      if (line.trim() === '') {
        index = 0;
        return line;
      }

      const item = NUMBERED_ITEM_LINE.exec(line);
      if (!item) return line;

      index += 1;
      const [marker, indent = ''] = item;
      return `${indent}${index}.${line.slice(marker.length)}`;
    })
    .join('\n');
}

/** Each section name a rendered prompt carries, mapped to the number its heading landed on. */
export type SectionNumbers = ReadonlyMap<string, number>;

/**
 * Walk the surviving `[SECTION:…]` declarations and give each the number its heading lands on.
 *
 * Separate from {@link applySectionNumbers} because the numbers are wanted twice: by the prompt
 * body, whose citations that function resolves, and by the two model wrappers, which cite sections
 * in text added after the markers are gone. Both read this one walk, which is what keeps a section
 * added anywhere from moving one set of citations and not the other.
 *
 * **A name declared twice throws.** The two headings that vary by target — section 5's rig pair and
 * the layout section's audit pair — each declare one name from mutually exclusive `[IF:…]` blocks, so
 * exactly one survives. Two survivors would mean a condition that is no longer exclusive, and the
 * symptom would be a second section quietly sharing the first one's number.
 *
 * **Run it after {@link applyConditionals}**, or a dropped section still takes a number.
 */
export function sectionNumbers(template: string): SectionNumbers {
  const numbers = new Map<string, number>();
  for (const [, name = ''] of template.matchAll(SECTION_DECLARATION)) {
    if (numbers.has(name)) throw new Error(`Prompt template: [SECTION:${name}] was declared twice.`);
    numbers.set(name, numbers.size);
  }
  return numbers;
}

/**
 * Number each section from zero, in the order the surviving headings appear, and resolve every
 * citation of one to the number it landed on.
 *
 * **The template must not write the numerals itself, for the reason {@link applyNumbering} gives
 * about list items — and the cost of it having done so was larger here.** Section 5 is conditional
 * on the rig mode, and five of the nine categories have no rig at all, so those prompts ran
 * `## 4. COMPONENT INVENTORY` straight into `## 6. REQUIRED ASSEMBLY CAPABILITY` — a gap in the
 * numbering of a document whose prose cites its own sections several hundred times. The adherence
 * report already had the same problem one section further down and answered it by writing its
 * heading **twice**, once behind `[IF:EMIT_MANIFEST]` and once behind the negation; that does not
 * scale past one conditional section, and it left the citations in section 0 to be kept in step by
 * hand regardless.
 *
 * So a heading declares itself, `## [SECTION:EXCLUSIONS]. EXCLUSIONS`, and prose cites it,
 * `section [SEC:EXCLUSIONS]`. Both resolve from one walk, which means a section that is dropped
 * takes its number with it and every citation of the sections after it moves down together.
 *
 * Counting **from zero** rather than one: section 0 is the output contract, deliberately, because
 * it holds the constraints that fail most often and attention weighting favours early tokens.
 *
 * **A citation of a section this prompt does not carry throws** rather than emitting something that
 * still reads as prose. Nothing cites the conditional sections today, and a citation that started to
 * would otherwise render as `section undefined` — the same failure {@link substitute} refuses for a
 * `[DEFINE:…]`, and refused for the same reason. The other failure, a name declared twice, is
 * {@link sectionNumbers}'s, since that is where the walk lives.
 *
 * **Run it after {@link applyConditionals}**, or a dropped section still takes a number, which is
 * the whole defect; and before {@link assertBlocksResolved}, which is what catches a marker
 * malformed enough to match neither pattern.
 */
export function applySectionNumbers(template: string): string {
  const numbers = sectionNumbers(template);
  const resolve = (marker: string, name: string): string => String(numberOf(numbers, name, marker));

  return template
    .replace(SECTION_DECLARATION, (marker, name: string) => resolve(marker, name))
    .replace(SECTION_REFERENCE, (marker, name: string) => resolve(marker, name));
}

/**
 * Cite a section from prose the template does not hold.
 *
 * A model wrapper runs on the *rendered* prompt, after {@link applySectionNumbers} has consumed
 * every marker, so a `[SEC:…]` written there would reach the model as literal template text. The
 * numerals were therefore hand-written into the Sol and Seedream wrappers — the worst place in the
 * app for a citation to quietly re-point, since naming the blocks that may not be shortened is the
 * whole of what those two do. A section inserted before the inventory, or the contract ever becoming
 * conditional, would have moved the prompt's own citations and left theirs behind.
 *
 * So they take the numbers from this walk and name their sections rather than their numbers. A name
 * this prompt does not carry throws, for the reason a `[SEC:…]` of one does: `section undefined` in
 * front of the model is the failure, not the missing map entry.
 *
 * **The wrappers are not the only prompt text that hand-writes a section number, and this does not
 * reach the rest.** Thirteen strings in `constants/promptText/` and `constants/sheetPlans/` state
 * one too, and they are filled by {@link substitute}, which runs *last* — so a marker written into
 * one of them ships literally, and resolving citations over the values wholesale would throw on a
 * subject field a reader typed a marker into. Deriving those needs a decision about where the
 * app/user boundary sits in the value record, which is issue #96 rather than this function.
 */
export function citeSection(numbers: SectionNumbers, name: string): string {
  return String(numberOf(numbers, name, `section ${name}`));
}

/** One lookup, so a citation from prose and one from a marker cannot disagree about the answer. */
function numberOf(numbers: SectionNumbers, name: string, citation: string): number {
  const number = numbers.get(name);
  if (number === undefined) {
    throw new Error(`Prompt template: ${citation} names no section this prompt carries.`);
  }
  return number;
}

/**
 * Replace every `[DEFINE:NAME]` with its value.
 *
 * A token with no value **throws**. The alternative — leaving it in place — sends literal template
 * text to the model, which is both the least recoverable failure here and the easiest to not notice,
 * since the prompt still reads as prose.
 */
export function substitute(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(DEFINE_TOKEN, (_token, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`Prompt template: no value supplied for [DEFINE:${name}].`);
    return value;
  });
}

/**
 * Fail if a block marker survived the conditional, section, optional and numbering passes.
 *
 * A marker that is malformed — split across lines, mis-spelled, indented into a code fence — matches
 * no pattern at all and would otherwise travel to the model untouched. This is the check that
 * catches those. A surviving `[N]` is the same failure in the numbering pass: one written mid-line,
 * or followed by anything other than a period, is not a list item and would reach the model as
 * literal template text. Like the block markers, it catches only a *well-formed* marker in the wrong
 * place — `[N ].` is misspelled rather than misplaced, and matches nothing here either.
 *
 * **Run it between `applyNumbering` and `substitute`, never after.** After substitution the text
 * holds whatever the user typed into sixteen free-text fields, and a subject of `Robot [IF:X] guard`
 * is a strange name, not a broken template — throwing there would take the app down mid-render for
 * an input it should simply pass through.
 */
export function assertBlocksResolved(template: string): void {
  const residue = RESIDUAL_BLOCK_MARKER.exec(template);
  if (residue === null) return;
  const line = template.slice(0, residue.index).split('\n').length;
  throw new Error(`Prompt template: unresolved marker "${residue[0]}" survived rendering, at line ${line}.`);
}
