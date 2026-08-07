/**
 * The three passes that turn the prompt template into a prompt, plus the guard that proves nothing
 * was left behind.
 *
 * Pure functions of their arguments — no state, no DOM — which is what lets the compiler stay a
 * pure function and the preview derive its output during render.
 *
 * **Run them in this order: conditionals, then optionals, then substitution.** Conditionals go first
 * so that optionals inside a dropped block are dropped with it; substitution goes last because an
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

/**
 * The block markers, which the first two passes must have consumed.
 *
 * `[DEFINE:…]` is deliberately absent: substitution runs last and rejects an unknown token itself,
 * and by then the text contains arbitrary user input. Scanning *that* for markers would make a
 * subject field of `Robot [IF:X] guard` throw out of the compiler.
 */
const RESIDUAL_BLOCK_MARKER = /\[(?:OPTIONAL|IF):|\[\/IF\]/;

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
 * theirs beneath it — section 9's self-audit applies only to a target that can act on it, and
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
 * Fail if a block marker survived the conditional and optional passes.
 *
 * A marker that is malformed — split across lines, mis-spelled, indented into a code fence — matches
 * no pattern at all and would otherwise travel to the model untouched. This is the check that
 * catches those.
 *
 * **Run it between `applyOptionals` and `substitute`, never after.** After substitution the text
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
