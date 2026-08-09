import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ColorPlan, SheetFacts } from '../../types/quantiser.ts';
import { GridControls } from './GridControls.tsx';

/**
 * What the panel *says* about the sheet's scale, across the four states it can be in.
 *
 * The panel's whole job is to keep a number and its provenance together, so its failures are
 * failures of agreement rather than of rendering: a badge that calls a scale measured when it was
 * estimated, or a paragraph that goes on asking for a click after the reader has clicked. Neither
 * shows up in a type, and both are what a reader would act on.
 */

const COLOR_PLAN: ColorPlan = {
  reduction: null,
  setting: 'UNRESTRICTED',
  effect: 'left as they are',
};

const factsWith = (scale: SheetFacts['scale']): SheetFacts => ({ scale, colors: 1024 });

function show(facts: SheetFacts | null, grid: number | null) {
  render(
    <GridControls
      facts={facts}
      target={null}
      suggested={null}
      grid={grid}
      colorPlan={COLOR_PLAN}
      onGridChange={() => undefined}
    />,
  );
}

describe('GridControls', () => {
  it('says an exact reading was measured, and explains nothing further', () => {
    // Nothing to act on: the scale is in the box, and the panel that keeps talking about a settled
    // answer is the one a reader learns to stop reading.
    show(factsWith({ grid: 8, measurement: 'EXACT' }), 8);

    expect(screen.getByText(/measured where the art changes/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing in this image changes on a regular grid/)).toBeNull();
  });

  it('marks an estimate as an estimate, and asks for the click that would apply it', () => {
    show(factsWith({ grid: 8, measurement: 'ESTIMATED' }), null);

    expect(screen.getByText(/estimated from the softened edges/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /8× estimated/ })).toBeInTheDocument();
    expect(screen.getByText(/Its edges do soften at a regular spacing/)).toBeInTheDocument();
  });

  it('stops asking for the click once the estimate has been applied', () => {
    // The regression this test exists for. The paragraph asserts a *state* — "it is an estimate
    // rather than a measurement, so it has not been applied: click it" — and that stops being true
    // the moment a grid is in force. Left up, the panel asks for something the reader has already
    // done, beside a box holding the number and a preview showing the result.
    show(factsWith({ grid: 8, measurement: 'ESTIMATED' }), 8);

    expect(screen.queryByText(/so it has not been applied/)).toBeNull();
    // The badge and the candidate stay: they report where the number came from, which is still true
    // and is the one thing the reader must not lose track of once it is applied.
    expect(screen.getByText(/estimated from the softened edges/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /8× estimated/ })).toBeInTheDocument();
  });

  it('keeps asking for a number when neither reading found a scale, whatever is typed', () => {
    // The counterpart, and the asymmetry is deliberate: this paragraph is *instructions* — what to
    // type, what a grid of 1 does, what to do about a margin — and every word stays true after the
    // reader answers, so it stays up where the estimate's does not.
    show(factsWith(null), null);
    expect(screen.getByText(/neither reading of the sheet found a scale/)).toBeInTheDocument();

    show(factsWith(null), 6);
    expect(screen.getAllByText(/neither reading of the sheet found a scale/)).not.toHaveLength(0);
  });

  it('says it is still looking, and offers nothing to try, before the sheet has been read', () => {
    show(null, null);

    expect(screen.getByText(/Measuring the sheet/)).toBeInTheDocument();
    // The candidate row goes entirely, rather than standing empty: there is nothing to try yet, and
    // a bare "Try" with no scale beside it reads as one that failed to render.
    expect(screen.queryByText('Try')).toBeNull();
    expect(screen.queryByRole('button', { name: /measured|estimated|target size/ })).toBeNull();
  });
});
