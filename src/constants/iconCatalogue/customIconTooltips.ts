import { fieldLabelFor } from '../categories/index.ts';
import { CUSTOM_ICON_LIMITS } from './customIconLimits.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/**
 * Guidance for the fields of the catalogue dialog's form for an icon of the reader's own — the controls
 * there that hold a value. The form's buttons are `ICON_CATALOGUE_ACTION_TOOLTIPS`'.
 *
 * Each says what the field becomes in the compiled prompt or the sprite pack, since an entry of the
 * reader's own reaches both exactly as a catalogue entry does.
 */
export const CUSTOM_ICON_TOOLTIPS = {
  role: `What the icon is for in your game, such as “Keycard to the vault level”, in up to ${String(CUSTOM_ICON_LIMITS.role)} characters. It opens the icon’s line on the sheet, so the generator reads the purpose before the look.\n\nIts plain letters and digits become the slot and file name: “Keycard to the vault level” is \`keycard-to-the-vault-level\`. That name has to be one no catalogue icon, overlay piece or other icon on your set already uses.`,

  kind: `Which shelf the icon sits on. Your own icons sit at the end of their kind’s shelves, so a quest relic shares a sheet with the quest items rather than with the system panels, and the summary counts it under its kind.\n\nA _${ICON_KIND_LABELS.SPELL}_ entry belongs to a damage school as well.`,

  school: `The damage school this spell or ability belongs to. The sheet closes its line on the school’s name in your ${fieldLabelFor('ICON', 'setting')} and its one colour by hex, which leads the icon ahead of your set’s own colours, as it does for every catalogue spell.`,

  figure:
    'Tick this when the drawing is meant to include a hand, a face or a figure, such as an emote. The sheet draws one your look names either way; ticking it tells the form the figure is meant, so it stops warning about one, and the row’s card says so. Nothing in the prompt changes.',

  twoState:
    'Draws the icon twice, once in each of two states, such as a toggle drawn on and then off. The pair counts as two components, always shares a sheet, and names its two sprites after the role and each state.',

  firstState: `The state drawn first, such as “on”, in up to ${String(CUSTOM_ICON_LIMITS.state)} characters. Its plain letters and digits end the first sprite’s slot name, so “on” makes \`<role>-on\`.`,

  secondState: `The state drawn second, such as “off”, in up to ${String(CUSTOM_ICON_LIMITS.state)} characters, and different from the first. Its plain letters and digits end the second sprite’s slot name.`,

  look: `What the icon is drawn as, in your own words and for your own world, such as “a scorched brass keycard on a snapped chain”, in up to ${String(CUSTOM_ICON_LIMITS.look)} characters. It completes the icon’s line on the sheet after the role, and the sheet draws it as written whatever the ${fieldLabelFor('ICON', 'setting')} says.\n\nThe form warns about a word the sheet’s own rules overrule, such as your key’s colour or a dial that invites numerals, and saves your look as written either way.`,
} as const;
