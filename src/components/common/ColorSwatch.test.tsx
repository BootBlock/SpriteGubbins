import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { parseColorFromText } from '../../utils/colorParser.ts';
import { ColorSwatch } from './ColorSwatch.tsx';

/**
 * The dot beside a field that previews the colour its text names.
 *
 * What the text names is `parseColorFromText`'s question, and its own suite answers it. What is left
 * here is what the swatch does with the answer: paint exactly that colour, paint nothing at all when
 * there is none, and stay out of the accessibility tree, because the words that produced it are right
 * beside it.
 */
describe('ColorSwatch', () => {
  it('draws nothing for text that names no colour', () => {
    // Most fields are not about colour. A fallback dot beside a species name would be a swatch that lies.
    expect(parseColorFromText('Katana Specialist')).toBeNull();

    const { container } = render(<ColorSwatch colorText="Katana Specialist" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('paints the colour the parser finds in the text', () => {
    const hex = parseColorFromText('Cyan Neon Trim');
    if (hex === null) throw new Error('the fixture should name a colour.');

    const { container } = render(<ColorSwatch colorText="Cyan Neon Trim" />);

    expect(container.firstElementChild).toHaveStyle({ backgroundColor: hex });
  });

  it('keeps itself out of the accessibility tree', () => {
    const { container } = render(<ColorSwatch colorText="Matte Charcoal Black #06B6D4" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
