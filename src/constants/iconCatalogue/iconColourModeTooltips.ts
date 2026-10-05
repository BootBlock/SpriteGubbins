import { ROSTER_CHANGE_IS_ONE_UNDO_STEP } from '../guidanceSentences.ts';
import { ICON_COLOUR_MODE_LABELS } from './iconColourModeLabels.ts';

/**
 * Guidance for the colour control in the studio's *Icons on this set* section — a control that holds a
 * value, so its card is a `Tooltip` beside the label (audit finding M1).
 *
 * It says what each mode changes in the compiled prompt (the icon sheets, and never the overlay sheet)
 * and the one setting a tint mask takes away, the `PURE_WHITE` key, which the studio moves for the
 * reader. It names each mode by the label its pill shows, so a renamed label cannot leave the card
 * describing a pill that is not there.
 */
export const ICON_COLOUR_MODE_TOOLTIPS = {
  colourMode: `How every icon on this set is coloured. It changes the prompt for every icon sheet of the set; the overlay sheet keeps its colours.

- _${ICON_COLOUR_MODE_LABELS.FULL_COLOUR}_: each icon is painted in its own colours and the set’s.
- _${ICON_COLOUR_MODE_LABELS.TINT_MASK}_: each icon is drawn in neutral greys, each colour drawn as its lightness, so your engine can multiply a team or faction colour over it. One icon then serves every side of a match.

A tint mask cannot take the \`PURE_WHITE\` background key, because its lightest greys sit close enough to white to be keyed out. Choosing one moves that key to \`MAGENTA_FF00FF\`. ${ROSTER_CHANGE_IS_ONE_UNDO_STEP}`,
} as const;
