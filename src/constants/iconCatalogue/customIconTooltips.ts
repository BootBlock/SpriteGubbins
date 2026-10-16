import { fieldLabelFor } from '../categories/index.ts';
import { TINT_MASK_GREYS_THE_SCHOOL } from '../guidanceSentences.ts';
import { CUSTOM_ICON_FAMILY_SIZE, CUSTOM_ICON_LIMITS } from './customIconLimits.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';
import { NEUTRAL_RARITY_TIER } from './rarityTiers.ts';

/**
 * Guidance for the fields of the catalogue dialog's form for an icon of the reader's own — the controls
 * there that hold a value. The form's buttons are `ICON_CATALOGUE_ACTION_TOOLTIPS`'.
 *
 * Each says what the field becomes in the compiled prompt or the sprite pack, since an entry of the
 * reader's own reaches both exactly as a catalogue entry does.
 */
export const CUSTOM_ICON_TOOLTIPS = {
  role: `What the icon is for in your game, such as “Keycard to the vault level”, in up to ${String(CUSTOM_ICON_LIMITS.role)} characters. It opens the icon’s line on the sheet, so the generator reads the purpose before the look.\n\nIts plain letters and digits become the slot and file name: “Keycard to the vault level” is \`keycard-to-the-vault-level\`. That name has to be one no catalogue icon, overlay piece or other icon on your set already uses.`,

  kind: `Which shelf the icon sits on. Your own icons sit after the last of their kind’s shelves, so a quest relic is drawn among your items rather than among the system panels, and the summary counts it under its kind.\n\nA _${ICON_KIND_LABELS.SPELL}_ entry belongs to a damage school as well.`,

  school: `The damage school this spell or ability belongs to. The sheet closes its line on the school’s name in your ${fieldLabelFor('ICON', 'setting')} and its one colour by hex, which leads the icon ahead of your set’s own colours, as it does for every catalogue spell.\n\n${TINT_MASK_GREYS_THE_SCHOOL}`,

  figure:
    'Tick this when the drawing is meant to include a hand, a face or a figure, such as an emote. The sheet draws one your look names either way; ticking it tells the form the figure is meant, so it stops warning about one, and the row’s card says so. Nothing in the prompt changes.',

  shape: `Whether the sheet draws this entry once, once in each of two states, such as a toggle drawn on and then off, or as a family of ${String(CUSTOM_ICON_FAMILY_SIZE.fewest)} to ${String(CUSTOM_ICON_FAMILY_SIZE.most)} variants of one design, such as a small, a standard and a large potion.

Each drawing is one component and names its sprite after the role, and a pair or a family always shares a sheet.`,

  variantName: `What this member of the family is called, such as “small”, in up to ${String(CUSTOM_ICON_LIMITS.variantName)} characters. The sheet names it in the icon’s line, and its plain letters and digits end its sprite’s slot name, so “small” makes \`<role>-small\`.`,

  variantLook: `How this member differs from the rest of its family, such as “a thumb-length vial”, in up to ${String(CUSTOM_ICON_LIMITS.variantLook)} characters, or nothing where the name says it. The sheet adds it after the member’s name, and draws every member in the look below.

For one icon at each rarity, name the members after their tiers and set _Rarity Tier_ to \`${NEUTRAL_RARITY_TIER}\`, so the overlay sheets’ tier marks tell them apart; the form warns when a member names a tier the set’s _Rarity Tier_ overrules.`,

  firstState: `The state drawn first, such as “on”, in up to ${String(CUSTOM_ICON_LIMITS.state)} characters. Its plain letters and digits end the first sprite’s slot name, so “on” makes \`<role>-on\`.`,

  secondState: `The state drawn second, such as “off”, in up to ${String(CUSTOM_ICON_LIMITS.state)} characters, and different from the first. Its plain letters and digits end the second sprite’s slot name.`,

  look: `What the icon is drawn as, in your own words and for your own world, such as “a scorched brass keycard on a snapped chain”, in up to ${String(CUSTOM_ICON_LIMITS.look)} characters. It completes the icon’s line on the sheet after the role, it is shared by every member of a family, and the sheet draws it as written whatever the ${fieldLabelFor('ICON', 'setting')} says.\n\nThe form warns about a word the sheet’s own rules overrule, such as your key’s colour or a dial that invites numerals, and saves your look as written either way.`,
} as const;
