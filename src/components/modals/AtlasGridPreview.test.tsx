import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { calculateAtlasMetrics, widthBiasFor } from '../../utils/atlasCalculator.ts';
import { AtlasGridPreview } from './AtlasGridPreview.tsx';

/**
 * The panel's whole claim is that it draws the numbers beside it and claims nothing about the sheet
 * the generator returns. These hold the three parts of that a test can check without a stylesheet:
 * the legend is text rather than a pointer-only readout, the drawing itself stays out of the
 * accessibility tree, and the guidance saying what the picture is not is actually reachable.
 */
function renderPreview() {
  const metrics = calculateAtlasMetrics({
    canvasSize: 2048,
    padding: 4,
    componentCount: 43,
    widthBias: widthBiasFor('WIDE_16_9'),
  });
  render(<AtlasGridPreview metrics={metrics} canvasSize={2048} componentCount={43} />);
  return metrics;
}

describe('AtlasGridPreview', () => {
  it('states the filled and empty split as text, not only as a hover readout', () => {
    const metrics = renderPreview();

    // This replaced a per-cell hover that reported a slot number, row and column — pointer-only, and
    // a coordinate into a layout the prompt never asks the generator for. The count is the legend
    // the drawing actually needs, and a keyboard or screen-reader user gets it too.
    expect(screen.getByText(`43 of ${metrics.slots} slots filled`)).toBeInTheDocument();
    expect(screen.getByText(`Atlas packing plan (${metrics.columns}×${metrics.rows})`)).toBeInTheDocument();
  });

  it('keeps the drawing out of the accessibility tree', () => {
    renderPreview();

    // ~120 identical cells announced one by one would be noise, and every fact they carry — the grid
    // shape, the count, the empty slots, the share of texture in use — is stated in text by this
    // panel's heading and the metric tiles above it.
    expect(document.querySelectorAll('[aria-hidden="true"] .grid')).toHaveLength(1);
  });

  it('explains what the picture is, since it is not the sheet the generator returns', () => {
    renderPreview();

    expect(screen.getByRole('button', { name: 'Guidance: Atlas packing plan' })).toBeInTheDocument();
  });
});
