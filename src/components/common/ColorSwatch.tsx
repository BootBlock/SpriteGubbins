import { parseColorFromText } from '../../utils/colorParser.ts';

interface ColorSwatchProps {
  /** Free text that may name or contain a colour — a field's current value. */
  readonly colorText: string;
}

/**
 * A dot showing the colour a field's text describes, so `Cyan Neon #06B6D4` previews as cyan.
 *
 * Renders nothing when no colour can be found, which is the common case: most fields are not about
 * colour at all, and a fallback dot beside "Katana Specialist" would be a swatch that lies.
 *
 * **This is the app's one sanctioned inline `style`.** Every other colour in the interface comes
 * from a design token, but this one is the *user's* colour, resolved from what they typed — it
 * cannot be a utility class because it is not part of the palette.
 */
export function ColorSwatch({ colorText }: ColorSwatchProps) {
  const hex = parseColorFromText(colorText);
  if (hex === null) return null;

  return (
    <span
      // Decorative: the text that produced this colour is right beside it, so a screen reader that
      // announced the swatch too would be repeating itself.
      aria-hidden="true"
      title={`Colour preview: ${hex}`}
      style={{ backgroundColor: hex }}
      className="inline-block size-3.5 shrink-0 rounded-full border border-ink/40 shadow-sm transition-transform hover:scale-125"
    />
  );
}
