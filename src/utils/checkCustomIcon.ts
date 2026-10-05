import { CUSTOM_ICON_LIMITS } from '../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import { ICON_CAPACITY_NOTICES } from '../constants/iconCatalogue/iconCapacityNotices.ts';
import { COUNT_MARKER, LINE_SEPARATOR } from '../constants/iconCatalogue/iconLookRules.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { iconComponentCount } from '../constants/iconCatalogue/index.ts';
import type {
  CustomIconCheck,
  CustomIconDraft,
  CustomIconField,
  CustomIconRefusal,
} from '../types/customIconDraft.ts';
import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import { iconPickId } from './iconPickId.ts';
import { iconRosterTally } from './iconRosterTally.ts';
import { iconSlotNames } from './iconSlotNames.ts';
import { rosterIcon } from './rosterIcon.ts';
import { slugify } from './slugify.ts';
import { takenIconSlotNames } from './takenIconSlotNames.ts';

/**
 * Whether an entry of the reader's own may join a roster or a project's library, and the entry it makes
 * if so — the one gate every custom entry passes, from the catalogue dialog's form, from the stores'
 * actions, from storage and from a library pack.
 *
 * **What it refuses, and why each is a refusal rather than a warning:**
 *
 * - **An empty, over-long or bracketed role, look or state.** Each text reaches the inventory, which the
 *   compiler resolves `[SEC:…]` citations over, so a square bracket either throws out of the compiler or
 *   is silently replaced by a section number (R9 of `docs/todo/done/icon-catalogue.md`). An empty text is a
 *   line with nothing to draw, and the limits are `CUSTOM_ICON_LIMITS`'.
 * - **A count in any text, or a long dash in a role or state** (`COUNT_MARKER`, `LINE_SEPARATOR`).
 *   Section 4 reads `×N` as N separate drawings and the dash as the line's divide between role and look,
 *   so either in the reader's words breaks the line: `Arrow ×5` would ask for five arrows in one slot
 *   and shift every slot after it.
 * - **A role or state with no plain letter or digit**, since the slot name is made of those alone.
 * - **A slot name something else already answers to** — a catalogue entry or one of its pair's drawings,
 *   an overlay piece, another pick on this roster, or another entry of the project's library (`library`)
 *   — because two sprites answering to one name are cut to one file, and the second overwrites the
 *   first. The library counts even where it is not ticked, since ticking it later would meet the clash.
 * - **A spell with no school, or a school on anything else**, which is the catalogue's own rule.
 * - **An entry the set has no room for**, measured against `ICON_ROSTER_CAPACITY` as a tick is — where
 *   the entry is going onto the set. A change to a library entry the set does not hold is not measured,
 *   since it changes nothing the sheets draw.
 * - **A change to an entry neither on the roster nor in the library** — cleared, unticked, deleted or
 *   undone away while its form was open — since there is nothing left for the change to replace.
 *
 * Every one of these breaks the output whatever the reader's world is. What depends on the world and
 * the key — a colour, a lettered object, a hand — is `customIconWarnings`', which warns and never refuses.
 *
 * **Normalised, never rewritten**: whitespace runs collapse to one space, since a line break inside an
 * inventory line would read as two lines; the role and the look lose the punctuation they end on, since
 * the inventory line closes on its own full stop and `a chain.` would end it `..`; and the states become
 * slugs, as a catalogue entry's are. The reader's spelling and the rest of their punctuation are their
 * own. `replacing` names the entry an edit replaces, which
 * is measured as gone from the roster and the library alike. `library` is the active project's library
 * as the caller holds it: the roster parser and a pack's parser pass none, since a stored entry is read
 * on its own, and a re-tick passes the library without the entry being ticked.
 */
export function checkCustomIcon(
  draft: CustomIconDraft,
  picks: readonly IconPick[],
  replacing: string | null,
  library: readonly CustomIconEntry[],
): CustomIconCheck {
  const refusals: CustomIconRefusal[] = [];
  const role = unclosed(collapsed(draft.role));
  const look = unclosed(collapsed(draft.look));
  const id = slugify(role);
  refusals.push(...textRefusals('role', role, 'role'), ...textRefusals('look', look, 'look'));
  if (role === '') refusals.push({ field: 'role', message: CUSTOM_ICON_REFUSALS.roleEmpty });
  else if (id === '') refusals.push({ field: 'role', message: CUSTOM_ICON_REFUSALS.roleUnnamed });
  if (look === '') refusals.push({ field: 'look', message: CUSTOM_ICON_REFUSALS.lookEmpty });

  const states = draft.states === null ? null : statesOf(draft.states, refusals);
  if (draft.kind === 'SPELL' && draft.school === null) {
    refusals.push({ field: 'school', message: CUSTOM_ICON_REFUSALS.schoolMissing });
  } else if (draft.kind !== 'SPELL' && draft.school !== null) {
    refusals.push({ field: 'school', message: CUSTOM_ICON_REFUSALS.schoolStray });
  }

  const onSet = picks.some((pick) => pick.source === 'CUSTOM' && pick.entry.id === replacing);
  if (replacing !== null && !onSet && !library.some((held) => held.id === replacing)) {
    refusals.push({ field: 'set', message: CUSTOM_ICON_REFUSALS.gone });
  }
  const others = picks.filter((pick) => iconPickId(pick) !== replacing);
  const shelved = library.filter((held) => held.id !== replacing);
  const entry: CustomIconEntry = {
    id,
    role,
    kind: draft.kind,
    ...(draft.kind === 'SPELL' && draft.school !== null ? { school: draft.school } : {}),
    ...(draft.figure ? { figure: true } : {}),
    ...(states === null ? {} : { states }),
    look,
  };
  if (id !== '') refusals.push(...slotRefusals(entry, others, shelved));
  const left = ICON_ROSTER_CAPACITY - iconRosterTally(others).components;
  const needed = iconComponentCount(entry);
  if ((replacing === null || onSet) && needed > left) {
    refusals.push({ field: 'set', message: ICON_CAPACITY_NOTICES.row(needed, left) });
  }

  return refusals.length === 0 ? { entry, refusals } : { entry: null, refusals };
}

/** A text with every run of whitespace, line breaks included, made one space, and its ends trimmed. */
function collapsed(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/**
 * A text with the punctuation it ends on taken off — the full stop, comma, semicolon, colon, question or
 * exclamation mark or ellipsis a reader closes a phrase with — since the line it joins supplies its own.
 */
function unclosed(text: string): string {
  return text.replace(/[\s.,;:!?…]+$/u, '');
}

/** The refusals any one text earns on its own: its length, its brackets, a count, and a dash outside a look. */
function textRefusals(
  field: CustomIconField,
  text: string,
  what: 'role' | 'look' | 'state',
): readonly CustomIconRefusal[] {
  const found: CustomIconRefusal[] = [];
  if (text.length > CUSTOM_ICON_LIMITS[what]) {
    found.push({ field, message: CUSTOM_ICON_REFUSALS.tooLong(what, text.length) });
  }
  if (/[[\]]/.test(text)) found.push({ field, message: CUSTOM_ICON_REFUSALS.brackets(what) });
  if (COUNT_MARKER.test(text)) found.push({ field, message: CUSTOM_ICON_REFUSALS.countMarker(what) });
  if (what !== 'look' && LINE_SEPARATOR.test(text)) {
    found.push({ field, message: CUSTOM_ICON_REFUSALS.separator(what) });
  }
  return found;
}

/**
 * The two states as slugs, with a refusal for each that cannot be one or that repeats the other.
 *
 * **The slug is held to the count rule as well as the text typed**, because the slug is what is stored
 * and read back through this same check: dropping a letter the slug cannot hold can leave a count where
 * the text had none (`éx5` is stored as `x5`), and an entry accepted as typed was refused on reload.
 */
function statesOf(
  typed: readonly [string, string],
  refusals: CustomIconRefusal[],
): readonly [string, string] {
  const first = collapsed(typed[0]);
  const second = collapsed(typed[1]);
  const slugs: readonly [string, string] = [slugify(first), slugify(second)];
  refusals.push(
    ...stateRefusals('firstState', first, slugs[0]),
    ...stateRefusals('secondState', second, slugs[1]),
  );
  if (slugs[0] === '') {
    refusals.push({ field: 'firstState', message: CUSTOM_ICON_REFUSALS.stateEmpty('first') });
  }
  if (slugs[1] === '') {
    refusals.push({ field: 'secondState', message: CUSTOM_ICON_REFUSALS.stateEmpty('second') });
  } else if (slugs[0] === slugs[1]) {
    refusals.push({ field: 'secondState', message: CUSTOM_ICON_REFUSALS.sameStates });
  }
  return slugs;
}

/** The refusals one state earns as typed, and a count its slug alone shows. */
function stateRefusals(
  field: 'firstState' | 'secondState',
  text: string,
  slug: string,
): readonly CustomIconRefusal[] {
  const found = textRefusals(field, text, 'state');
  const counted = found.some((refusal) => refusal.message === CUSTOM_ICON_REFUSALS.countMarker('state'));
  return counted || !COUNT_MARKER.test(slug)
    ? found
    : [...found, { field, message: CUSTOM_ICON_REFUSALS.countMarker('state') }];
}

/**
 * A refusal for each of the entry's names something else in the app, on the set or in the project's
 * library already answers to.
 */
function slotRefusals(
  entry: CustomIconEntry,
  others: readonly IconPick[],
  shelved: readonly CustomIconEntry[],
): readonly CustomIconRefusal[] {
  const taken = new Map(takenIconSlotNames());
  for (const held of shelved) {
    for (const name of [held.id, ...iconSlotNames(held)]) taken.set(name, `your library’s “${held.role}”`);
  }
  for (const pick of others) {
    const icon = rosterIcon(pick);
    if (icon === undefined) continue;
    const owner = icon.custom ? `your own “${icon.entry.role}”` : `the catalogue’s “${icon.entry.role}”`;
    for (const name of [icon.entry.id, ...iconSlotNames(icon.entry)]) taken.set(name, owner);
  }
  return [...new Set([entry.id, ...iconSlotNames(entry)])].flatMap((name) => {
    const owner = taken.get(name);
    return owner === undefined
      ? []
      : [{ field: 'role' as const, message: CUSTOM_ICON_REFUSALS.taken(name, owner) }];
  });
}
