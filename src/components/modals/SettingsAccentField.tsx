import { useId } from 'react';
import { ACCENT_LABELS, SETTINGS_TOOLTIPS, accentSwatchGuidance } from '../../constants/settings.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { ACCENT_HUES } from '../../types/settings.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

/**
 * Choosing the primary's hue, as a row of swatches painted in the colours they offer.
 *
 * **Each swatch carries `data-accent` itself**, which is the whole implementation: the
 * `[data-accent]` rules in `index.css` set the three accent tokens on whatever element wears the
 * attribute, so a button that declares it and then paints `bg-accent` renders that hue without a
 * single colour being named here. It is the idea a preset card uses to claim its own stop on the
 * wheel — assign the custom property on the element the `var()`s resolve against — reached through
 * the same `[data-accent]` rules the shell uses rather than through an inline `style`. So the
 * swatches cannot drift from what pressing them does: they are not a picture of the palette, they
 * *are* it.
 *
 * Not a `SegmentedChoice`, though the shape is close. That control's pills say what they are with a
 * *word*, and mark the current one by filling it with the view's colour. Here the fill is the
 * content, so neither half carries over: the name cannot be painted on the swatch without competing
 * with the hue it is naming, and a fill cannot say "chosen" when every sibling is filled too. Bending
 * one component to cover both would also have left the quantiser's zoom row carrying a colour it
 * never uses.
 *
 * A row of `aria-pressed` buttons rather than a radio group: they are laid out and operated as the
 * app's other small choices are, and `aria-pressed` is what `index.css`'s forced-colours block keys
 * the selected state off — in that mode the swatch's own colour is replaced by the system palette, so
 * a selection said in colour alone would be said in nothing at all.
 */
export function SettingsAccentField() {
  const accentHue = useSettingsStore((state) => state.settings.accentHue);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const labelId = useId();

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span id={labelId} className="text-xs font-semibold text-ink-muted">
          Accent colour
        </span>
        <Tooltip text={SETTINGS_TOOLTIPS.accentHue} hint="Accent colour" />
      </div>

      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {ACCENT_HUES.map((hue) => {
          const isSelected = hue === accentHue;
          return (
            // The ⓘ above explains the *row*; this names the individual hue, which is the half a
            // sighted reader cannot get from the swatches — the colours are the labels here, and
            // Ember against Gold is not a distinction one square makes on its own. The name is
            // already announced, so this adds nothing for a screen reader and everything for a
            // pointer.
            <ControlTooltip key={hue} hint={ACCENT_LABELS[hue]} text={accentSwatchGuidance(hue)}>
              <button
                type="button"
                data-accent={hue}
                aria-pressed={isSelected}
                onClick={() => {
                  void updateSettings({ accentHue: hue });
                }}
                className={`flex size-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-foundry-950 transition-transform duration-390 hover:scale-110 ${
                  isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-foundry-800' : ''
                }`}
              >
                {/*
                  The tick is the second way the selection is said, and it is near-black for the reason
                  every label on a coloured fill in this app is: these hues are light, so ink on one is
                  two light tones a shade apart. The name goes to assistive technology rather than under
                  the swatch — nine labels in a row is a paragraph of text where the colours are the
                  whole point, and each is already announced.
                */}
                {isSelected && <span aria-hidden="true">✓</span>}
                <span className="sr-only">{ACCENT_LABELS[hue]}</span>
              </button>
            </ControlTooltip>
          );
        })}
      </div>
    </div>
  );
}
