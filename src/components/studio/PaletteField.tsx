import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { PALETTE_CHOICES, paletteFor } from '../../constants/palettes/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import type { Palette } from '../../types/palette.ts';
import { channelLevels, channelSpaceSize } from '../../utils/channelLevels.ts';
import { ColorSwatch } from '../common/ColorSwatch.tsx';
import { SelectField } from '../common/SelectField.tsx';

/**
 * The colours the sheet may use, and — where they are a list — every one of them shown.
 *
 * The swatches are `ColorSwatch`, handed a hex string. That is not a workaround: the component takes
 * free text and resolves a colour out of it, and a bare `#0F380F` resolves to itself, so this is the
 * app's sanctioned colour surface being used for a colour the app's own palette does not contain —
 * which is exactly what it exists for. Nothing here claims a second exemption from the design
 * tokens.
 *
 * A channel-depth palette has no list to show — 512 or 32,768 swatches would be a wall, and the
 * ladder is the definition anyway — so the description carries the rule and the strip is absent.
 *
 * The strip is `aria-hidden` and is a visual convenience rather than the only statement of the
 * colours: the description gives the count and the rule, and the compiled prompt beside it lists
 * every entry in full, which is where a reader who cannot use the swatches gets them.
 */
export function PaletteField() {
  const palette = useOutputStore((state) => state.output.palette);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  const pinned = paletteFor(palette);

  return (
    <div>
      <SelectField
        label="Palette"
        tooltip={OUTPUT_TOOLTIPS.palette}
        value={palette}
        choices={PALETTE_CHOICES}
        description={pinned === null ? '' : summarise(pinned)}
        onChange={(value) => {
          setOutputField('palette', value);
        }}
      />

      {pinned !== null && pinned.space.kind === 'FIXED' && (
        <div aria-hidden="true" className="mt-2 flex flex-wrap gap-1">
          {pinned.space.entries.map((hex) => (
            <ColorSwatch key={hex} colorText={hex} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One sentence naming what the palette permits, for the control's accessible description.
 *
 * Deliberately shorter than what the prompt carries: this answers "what did I just pin", and the
 * paragraph the generator reads answers "what may you draw", which is a different question and four
 * times the length.
 */
function summarise(palette: Palette): string {
  const size =
    palette.space.kind === 'FIXED'
      ? `${String(palette.space.entries.length)} fixed colours`
      : `${String(channelSpaceSize(palette.space.bitsPerChannel))} colours, ` +
        `${String(channelLevels(palette.space.bitsPerChannel).length)} levels per channel`;

  const perComponent =
    palette.colorsPerComponent === null
      ? ''
      : ` No component uses more than ${String(palette.colorsPerComponent)} at once.`;

  return `${size}. Supersedes the colour budget below, in the prompt and in the quantiser.${perComponent}`;
}
