import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { namesOmittingLabels } from './namesOmittingLabels.ts';

/**
 * The Label in Name check the list and download suites lean on. A wrong answer from it passes or
 * fails every one of them for the wrong reason, so the ways it can be wrong are pinned here.
 */
describe('namesOmittingLabels', () => {
  it('reports a name that says something other than the words on the button', () => {
    render(
      <button type="button" aria-label="Keep the saved settings “Flat sheets”">
        Cancel
      </button>,
    );

    expect(namesOmittingLabels()).toStrictEqual(['Cancel → Keep the saved settings “Flat sheets”']);
  });

  it('reports a label buried mid-name, since the app wants the name to open with it', () => {
    render(
      <a href="#palette" aria-label="Download the locked palette as .gpl">
        .gpl
      </a>,
    );

    expect(namesOmittingLabels()).toStrictEqual(['.gpl → Download the locked palette as .gpl']);
  });

  it('accepts a name that opens with the label, whatever the case and spacing', () => {
    render(
      <>
        <button type="button" aria-label="Cancel — keep the project Harbour">
          Cancel
        </button>
        <button type="button" aria-label="expand all  Studio sections">
          Expand all
        </button>
        <button type="button">Save</button>
      </>,
    );

    expect(namesOmittingLabels()).toStrictEqual([]);
  });

  it('reads a label split across elements as the words the browser names it by', () => {
    // `textContent` gives `Harbour4` here, and the computed name is `Harbour 4`.
    render(
      <button type="button">
        <span>Harbour</span>
        <span>4</span>
      </button>,
    );

    expect(namesOmittingLabels()).toStrictEqual([]);
  });

  it('leaves out a decorative glyph, and an icon button with no words to match', () => {
    render(
      <>
        <button type="button" aria-label="Swatch PNG — download the locked palette">
          <span aria-hidden="true">⬇</span> Swatch PNG
        </button>
        <button type="button" aria-label="Guidance: Project">
          <span aria-hidden="true">i</span>
        </button>
        <button type="button" aria-label="Dismiss notification">
          ✕
        </button>
      </>,
    );

    expect(namesOmittingLabels()).toStrictEqual([]);
  });

  it('ignores a control no reader can reach', () => {
    render(
      <div aria-hidden="true">
        <button type="button" aria-label="Keep it">
          Cancel
        </button>
      </div>,
    );

    expect(namesOmittingLabels()).toStrictEqual([]);
  });
});
