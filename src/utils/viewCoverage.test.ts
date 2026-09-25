import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { viewCoverage } from './viewCoverage.ts';

describe('viewCoverage', () => {
  it('gives the EIGHT_COMPASS diagonal core no side, front or rear view', () => {
    expect(viewCoverage(['south-west', 'north-west', 'north-east', 'south-east'])).toStrictEqual({
      sideView: false,
      frontAndRearViews: false,
      turnedAwayViews: true,
      diagonalViewsOnly: true,
    });
  });

  it('gives the cardinal core every square-on view and no diagonal', () => {
    expect(viewCoverage(['south', 'west', 'north', 'east'])).toStrictEqual({
      sideView: true,
      frontAndRearViews: true,
      turnedAwayViews: false,
      diagonalViewsOnly: false,
    });
  });

  it('gives THREE_CLASSIC a side view but no front and rear pair', () => {
    expect(viewCoverage(DIRECTION_LISTS.THREE_CLASSIC)).toStrictEqual({
      sideView: true,
      frontAndRearViews: false,
      turnedAwayViews: true,
      diagonalViewsOnly: false,
    });
  });

  it('reads the yaw rather than the name, so front and south are one view', () => {
    expect(viewCoverage(['front', 'north']).frontAndRearViews).toBe(true);
  });

  it('finds nothing turned away on a sheet whose views all face the camera or sit square to it', () => {
    expect(viewCoverage(['south-west', 'west']).turnedAwayViews).toBe(false);
    expect(viewCoverage(['west', 'east']).turnedAwayViews).toBe(false);
  });
});
