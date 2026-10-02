import { CUSTOM_ICON_LIMITS } from '../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import { ICON_CAPACITY_NOTICES } from '../constants/iconCatalogue/iconCapacityNotices.ts';
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
 * Whether an entry of the reader's own may join a roster, and the entry it makes if so — the one gate
 * every custom entry passes, from the catalogue dialog's form, from the store's actions and from storage.
 *
 * **What it refuses, and why each is a refusal rather than a warning:**
 *
 * - **An empty, over-long or bracketed role, look or state.** Each text reaches the inventory, which the
 *   compiler resolves `[SEC:…]` citations over, so a square bracket either throws out of the compiler or
 *   is silently replaced by a section number (R9 of `docs/todo/icon-catalogue.md`). An empty text is a
 *   line with nothing to draw, and the limits are `CUSTOM_ICON_LIMITS`'.
 * - **A role or state with no plain letter or digit**, since the slot name is made of those alone.
 * - **A slot name something else already answers to** — a catalogue entry or one of its pair's drawings,
 *   an overlay piece, or another pick on this roster — because two sprites answering to one name are cut
 *   to one file, and the second overwrites the first.
 * - **A spell with no school, or a school on anything else**, which is the catalogue's own rule.
 * - **An entry the set has no room for**, measured against `ICON_ROSTER_CAPACITY` as a tick is.
 *
 * Every one of these breaks the output whatever the reader's world is. What depends on the world and
 * the key — a colour, a lettered object, a hand — is `customIconWarnings`', which warns and never refuses.
 *
 * **Normalised, never rewritten**: whitespace runs collapse to one space, since a line break inside an
 * inventory line would read as two lines, and the states become slugs, as a catalogue entry's are. The
 * reader's spelling and punctuation are their own. `replacing` names the entry an edit replaces, which
 * is measured as gone.
 */
export function checkCustomIcon(
  draft: CustomIconDraft,
  picks: readonly IconPick[],
  replacing: string | null,
): CustomIconCheck {
  const refusals: CustomIconRefusal[] = [];
  const role = collapsed(draft.role);
  const look = collapsed(draft.look);
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

  const others = picks.filter((pick) => iconPickId(pick) !== replacing);
  const entry: CustomIconEntry = {
    id,
    role,
    kind: draft.kind,
    ...(draft.kind === 'SPELL' && draft.school !== null ? { school: draft.school } : {}),
    ...(draft.figure ? { figure: true } : {}),
    ...(states === null ? {} : { states }),
    look,
  };
  if (id !== '') refusals.push(...slotRefusals(entry, others));
  const left = ICON_ROSTER_CAPACITY - iconRosterTally(others).components;
  const needed = iconComponentCount(entry);
  if (needed > left) refusals.push({ field: 'set', message: ICON_CAPACITY_NOTICES.row(needed, left) });

  return refusals.length === 0 ? { entry, refusals } : { entry: null, refusals };
}

/** A text with every run of whitespace, line breaks included, made one space, and its ends trimmed. */
function collapsed(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/** The refusals any one text earns on its own: its length and its brackets. */
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
  return found;
}

/** The two states as slugs, with a refusal for each that cannot be one or that repeats the other. */
function statesOf(
  typed: readonly [string, string],
  refusals: CustomIconRefusal[],
): readonly [string, string] {
  const first = collapsed(typed[0]);
  const second = collapsed(typed[1]);
  refusals.push(
    ...textRefusals('firstState', first, 'state'),
    ...textRefusals('secondState', second, 'state'),
  );
  const slugs: readonly [string, string] = [slugify(first), slugify(second)];
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

/** A refusal for each of the entry's names something else in the app or on the set already answers to. */
function slotRefusals(entry: CustomIconEntry, others: readonly IconPick[]): readonly CustomIconRefusal[] {
  const taken = new Map(takenIconSlotNames());
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
