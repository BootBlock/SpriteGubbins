import { describe, expect, it } from 'vitest';
import { isTextEntry } from './isTextEntry.ts';

/** Build an element in the test document and hand it back, since only its type is under test. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}

/** An `<input>` of a given `type`, which is the whole of what separates the two answers. */
function input(type: string): HTMLInputElement {
  const field = element('input');
  field.type = type;
  return field;
}

/**
 * The realm the predicate is handed is always this document's, because the environment has only one.
 *
 * happy-dom's element classes are module singletons, so a second window it builds — an `<iframe>`'s
 * `contentWindow` included — reports the *same* `HTMLInputElement` as the page. Measured, not
 * assumed: an element made in an iframe's document is `instanceof` the opener's constructor there,
 * which is exactly what a browser does not do. So the cross-realm half of `isTextEntry` cannot be
 * asserted here — a test written for it would pass against a bare `instanceof` too, which is no test
 * at all. It was measured in Edge instead, against a `window.open` popup and a same-origin iframe;
 * `isTextEntry` records what came back.
 */
describe('isTextEntry', () => {
  it('says yes to a text input', () => {
    expect(isTextEntry(input('text'), window)).toBe(true);
  });

  it('says yes to a textarea', () => {
    expect(isTextEntry(element('textarea'), window)).toBe(true);
  });

  it('says yes to a contenteditable element, which has a stack of its own', () => {
    const region = element('div');
    region.contentEditable = 'true';
    expect(isTextEntry(region, window)).toBe(true);
  });

  it('says yes to an input type the browser does not know, which falls back to text', () => {
    expect(isTextEntry(input('quantity'), window)).toBe(true);
  });

  it('says no to a range slider, which holds no text', () => {
    expect(isTextEntry(input('range'), window)).toBe(false);
  });

  it('says no to the other input types that hold no text', () => {
    const bare = ['button', 'checkbox', 'color', 'file', 'image', 'radio', 'reset', 'submit'];
    expect(bare.map((type) => isTextEntry(input(type), window))).toEqual(bare.map(() => false));
  });

  it('says no to a read-only field, which refuses a drop and has no stack of its own', () => {
    const field = input('text');
    field.readOnly = true;
    expect(isTextEntry(field, window)).toBe(false);
  });

  it('says no to a read-only textarea, for the same reason', () => {
    const area = element('textarea');
    area.readOnly = true;
    expect(isTextEntry(area, window)).toBe(false);
  });

  it('says no to a disabled field, which takes nothing at all', () => {
    const field = input('text');
    field.disabled = true;
    expect(isTextEntry(field, window)).toBe(false);
  });

  it('says no to a select, which is a form control with nothing to edit', () => {
    expect(isTextEntry(element('select'), window)).toBe(false);
  });

  it('says no to an ordinary element', () => {
    expect(isTextEntry(element('div'), window)).toBe(false);
  });

  it('says no to no target at all', () => {
    expect(isTextEntry(null, window)).toBe(false);
  });

  it('says no to a target that is not an element, such as the document', () => {
    expect(isTextEntry(document, window)).toBe(false);
  });
});
