import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { repeatedControlNames } from './repeatedControlNames.ts';

/**
 * The check three list suites lean on to say that no two controls read alike. It is a test helper,
 * but a wrong answer from it passes or fails every one of those suites for the wrong reason, so the
 * two ways it can be wrong are pinned here.
 */
describe('repeatedControlNames', () => {
  it('reads a select named by its label, which a shortcut through aria-label cannot see', () => {
    render(
      <>
        <label htmlFor="first">Project</label>
        <select id="first">
          <option>Default</option>
        </select>
        <label htmlFor="second">Project</label>
        <select id="second">
          <option>Default</option>
        </select>
      </>,
    );

    expect(repeatedControlNames()).toStrictEqual(['Project']);
  });

  it('counts each extra copy once, across roles', () => {
    render(
      <>
        <button type="button">Delete</button>
        <button type="button">Delete</button>
        <button type="button">Delete</button>
        <a href="#top">Delete</a>
      </>,
    );

    expect(repeatedControlNames()).toStrictEqual(['Delete', 'Delete', 'Delete']);
  });

  it('ignores a control no reader can reach', () => {
    // The role query computes a name before it drops inaccessible elements, so a matcher that
    // recorded every call reported this pair as a repeat.
    render(
      <>
        <button type="button">Close</button>
        <div aria-hidden="true">
          <button type="button">Close</button>
        </div>
      </>,
    );

    expect(repeatedControlNames()).toStrictEqual([]);
  });
});
