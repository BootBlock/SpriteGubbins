import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColorPlan, SheetFacts, SheetReading } from '../../types/quantiser.ts';
import { QuantiseGuide } from './QuantiseGuide.tsx';

/**
 * What the guide says about the sheet actually on screen, across the states it can be in.
 *
 * The panel's static halves — the intro, the two step lists — render whatever the state, so the
 * tests here are about agreement: advice that matches the badge's reading of the sheet, a ceiling
 * that appears only while there is a number to find, and nothing asserted about a sheet that is
 * not there or not yet read.
 */

const COLOR_PLAN: ColorPlan = {
  reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  setting: 'RESTRAINED_64_COLOR',
  studioSetting: 'RESTRAINED_64_COLOR',
  studioIdentity: 'RESTRAINED_64_COLOR',
  effect: 'reduced to 64 colours chosen from the sheet',
  superseded: null,
};

const readWith = (scale: SheetFacts['scale']): SheetReading => ({
  kind: 'facts',
  facts: { scale, colors: 1024 },
});
const PENDING: SheetReading = { kind: 'pending' };

function show(
  reading: SheetReading,
  hasSheet: boolean,
  suggested: number | null = null,
  grid: number | null = null,
  dithered = false,
) {
  render(
    <QuantiseGuide
      reading={reading}
      hasSheet={hasSheet}
      target={suggested === null ? null : { width: 16, height: 32 }}
      suggested={suggested}
      grid={grid}
      colorPlan={COLOR_PLAN}
      dithered={dithered}
    />,
  );
}

describe('QuantiseGuide', () => {
  it('teaches the by-eye procedure before any sheet arrives, and claims nothing about one', () => {
    show(PENDING, false);

    expect(screen.getByText('Finding the scale by eye')).toBeInTheDocument();
    expect(screen.getByText(/Start from a candidate/)).toBeInTheDocument();
    expect(screen.queryByText(/No reading found a scale/)).toBeNull();
    expect(screen.queryByText(/measured outright and is already applied/)).toBeNull();
  });

  it('stays quiet about the sheet while the worker is still reading it', () => {
    // The reading is pending in two states — no sheet, and a sheet mid-measurement — and advice about a
    // sheet whose reading has not arrived would have to be retracted a moment later.
    show(PENDING, true);

    expect(screen.queryByText(/No reading found a scale/)).toBeNull();
    expect(screen.queryByText(/An estimate is waiting/)).toBeNull();
  });

  it('calls a measured sheet settled, and offers no ceiling to start from', () => {
    // The ceiling line says "start there and step downwards", which beside a scale already in force
    // would be the panel disagreeing with itself. A measured sheet's grid is the reading itself —
    // `useQuantiseWork` adopts an EXACT reading — so the pair arrives together.
    show(readWith({ grid: 8, measurement: 'EXACT' }), true, 13, 8);

    expect(screen.getByText(/measured outright and is already applied/)).toBeInTheDocument();
    expect(screen.queryByText(/For this sheet that ceiling is/)).toBeNull();
  });

  it('points an estimated sheet at the click, and fills the ceiling in with this sheet’s numbers', () => {
    show(readWith({ grid: 6, measurement: 'REPEAT_DISTANCE' }), true, 13);

    expect(screen.getByText(/An estimate is waiting under the grid box/)).toBeInTheDocument();
    expect(
      screen.getByText(/For this sheet that ceiling is 13×, derived from seating 16 × 32 px/),
    ).toBeInTheDocument();
  });

  it('stops asking for the click once a grid is in force, and asks for judgement instead', () => {
    // The regression the review caught before it shipped: the advice keyed on the reading alone,
    // and the reading does not change when the estimate is clicked — so the panel kept telling the
    // reader to click an estimate that was no longer waiting, beside a box holding the number.
    // `GridControls` drops its own paragraph at this exact moment, and the two must agree.
    show(readWith({ grid: 6, measurement: 'REPEAT_DISTANCE' }), true, 13, 6);

    expect(screen.queryByText(/An estimate is waiting under the grid box/)).toBeNull();
    expect(screen.getByText(/A scale is in force and the right preview/)).toBeInTheDocument();
    // The ceiling goes with it: the reader is stepping from where they are, not starting.
    expect(screen.queryByText(/For this sheet that ceiling is/)).toBeNull();
  });

  it('withdraws the settled claim from a measured sheet the reader has overtyped', () => {
    // The measured line says the scale "is already applied", which stops being true the moment the
    // box holds a different number — the overtyped grid is a hand-chosen number like any other, and
    // it is handed the judging line.
    show(readWith({ grid: 8, measurement: 'EXACT' }), true, null, 4);

    expect(screen.queryByText(/measured outright and is already applied/)).toBeNull();
    expect(screen.getByText(/A scale is in force and the right preview/)).toBeInTheDocument();
  });

  it('hands an unread sheet the whole procedure, with the ceiling where the studio names one', () => {
    show(readWith(null), true, 13);

    expect(screen.getByText(/No reading found a scale in this sheet/)).toBeInTheDocument();
    expect(screen.getByText(/For this sheet that ceiling is 13×/)).toBeInTheDocument();
  });

  it('omits the ceiling line where the studio names no target size', () => {
    show(readWith(null), true, null);

    expect(screen.getByText(/No reading found a scale in this sheet/)).toBeInTheDocument();
    expect(screen.queryByText(/For this sheet that ceiling is/)).toBeNull();
  });

  it('tells a sheet whose survey failed to type a scale, rather than staying quiet as if measuring', () => {
    show({ kind: 'failed', cause: 'sheet' }, true, 13);

    expect(screen.getByText(/This sheet could not be measured/)).toBeInTheDocument();
    expect(screen.queryByText(/No reading found a scale/)).toBeNull();
  });

  it('asks for judgement once a scale is typed over a failed survey', () => {
    show({ kind: 'failed', cause: 'sheet' }, true, null, 8);

    expect(screen.getByText(/A scale is in force/)).toBeInTheDocument();
    expect(screen.queryByText(/This sheet could not be measured/)).toBeNull();
  });

  it('offers no advice once the thread itself has died, since no typed scale would run', () => {
    show({ kind: 'failed', cause: 'thread' }, true, 13);

    expect(screen.queryByText(/This sheet could not be measured/)).toBeNull();
    expect(screen.queryByText(/No reading found a scale/)).toBeNull();
  });

  it('names the colour plan actually in force, and where it is changed', () => {
    show(PENDING, false);

    expect(screen.getByText(/the RESTRAINED_64_COLOR setting travels with the sheet/)).toBeInTheDocument();
    expect(screen.getByText(/reduced to 64 colours chosen from the sheet/)).toBeInTheDocument();
  });

  it('says where the cleanup dials sit once a dither is in force', () => {
    // The plan alone cannot say it: the policy is the same either way, and what a dither changes is
    // where in the pipeline it is applied — which takes the two cleanup passes past it. A paragraph
    // telling a reader those dials tidy what the policy produced would have the order backwards for
    // exactly the sheets where the order is worth knowing.
    show(readWith({ grid: 8, measurement: 'EXACT' }), true, null, 8, true);
    expect(screen.getByText(/tidying what the reading made of the sheet/)).toBeInTheDocument();

    cleanup();
    show(readWith({ grid: 8, measurement: 'EXACT' }), true, null, 8, false);
    expect(screen.getByText(/only tidy what that policy produced/)).toBeInTheDocument();
  });
});
