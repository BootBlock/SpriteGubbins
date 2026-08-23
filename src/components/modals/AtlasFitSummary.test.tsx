import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AtlasFitSummary } from './AtlasFitSummary.tsx';

/**
 * The row answers "does the component the prompt asks for fit this cell", and there are two ways it
 * can have nothing to answer with. The empty field is the obvious one. The other arrived with the
 * cut-out rig fix: a sheet whose components are the pieces a figure is assembled from states its
 * size for the assembly, so the studio hands this panel no component size even though the field in
 * front of the reader is full. Saying "no component size named" over `48 × 96 px assembled` reads as
 * the panel having failed to see it, which is a worse answer than the wrong number it replaced.
 *
 * **The two are told apart by the sheet, not by the field.** Driven the other way, a rig sheet with
 * the box empty got the branch that asks for a size — promising that naming one turns this into a
 * check, which on that sheet it never will: its components are pieces of whatever figure the size
 * describes. The ask belongs to the sheets where filling the box in actually does something.
 */
function renderFit(assembled: boolean) {
  render(
    <AtlasFitSummary
      usableBounds={504}
      fit={null}
      canvasSize={2048}
      smallestCanvas={null}
      assembled={assembled}
    />,
  );
}

describe('AtlasFitSummary with no component size to check', () => {
  it('asks for the studio field where the reader has not filled one in', () => {
    renderFit(false);

    expect(screen.getByText('No component size named')).toBeInTheDocument();
    expect(screen.getByText('Target Component Size')).toBeInTheDocument();
  });

  it('says why there is nothing to check where the size names the assembly', () => {
    renderFit(true);

    expect(screen.getByText('Not a component size')).toBeInTheDocument();
    // And it does not ask for a size, because no size the reader could give it would help.
    expect(screen.queryByText('Target Component Size')).not.toBeInTheDocument();
    expect(screen.getByText(/the pieces a figure is assembled from/u)).toBeInTheDocument();
  });
});
