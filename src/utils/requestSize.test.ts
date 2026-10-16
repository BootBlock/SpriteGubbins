import { describe, expect, it } from 'vitest';
import { ASPECT_RATIO_TERMS } from '../constants/aspectRatioTerms.ts';
import { TARGET_MODELS } from '../constants/models.ts';
import { NOMINAL_SHEET_SIZE } from '../constants/sheetCanvas.ts';
import { ASPECT_RATIOS, type RequestSizeLimits } from '../types/output.ts';
import { requestSizeFor } from './requestSize.ts';

/**
 * That every size the studio tells a reader to request is one the endpoint accepts.
 *
 * The sizes are derived from the declaration in `constants/models.ts`, and the assertions are
 * written out as OpenAI's image generation guide states its limits, so a declaration that drifts from
 * the guide derives a size these assertions refuse rather than one that agrees with itself: “Width and height must be multiples of 16, the aspect ratio must be between
 * 1:3 and 3:1, and neither edge may exceed 3840 pixels. The total pixel count must be between 655,360
 * and 8,294,400 (4K). Resolutions above 2560x1440 are experimental.”
 */
const GPT_IMAGE_CANVAS = TARGET_MODELS.find((model) => model.id === 'GPT_IMAGE')?.capabilities.canvas;
const GPT_IMAGE_LIMITS = GPT_IMAGE_CANVAS?.kind === 'REQUEST_SIZE' ? GPT_IMAGE_CANVAS.limits : null;

describe('requestSizeFor on GPT Image', () => {
  it('declares the canvas as the request’s size option', () => {
    expect(GPT_IMAGE_CANVAS).toMatchObject({ kind: 'REQUEST_SIZE', parameter: 'size' });
  });

  it.each(ASPECT_RATIOS)('gives %s a size inside every documented limit, at exactly its ratio', (aspect) => {
    if (GPT_IMAGE_LIMITS === null) throw new Error('GPT Image declares no request size.');
    const size = requestSizeFor(ASPECT_RATIO_TERMS[aspect], GPT_IMAGE_LIMITS);
    if (size === null) throw new Error(`No size for ${aspect}.`);
    const { width, height } = size;
    const terms = ASPECT_RATIO_TERMS[aspect];

    expect(width % 16).toBe(0);
    expect(height % 16).toBe(0);
    expect(Math.max(width, height)).toBeLessThanOrEqual(3 * Math.min(width, height));
    expect(Math.max(width, height)).toBeLessThanOrEqual(3840);
    expect(width * height).toBeGreaterThanOrEqual(655_360);
    expect(width * height).toBeLessThanOrEqual(8_294_400);
    // Not experimental: no edge past 2560x1440's long edge and no more pixels than it has.
    expect(Math.max(width, height)).toBeLessThanOrEqual(2560);
    expect(width * height).toBeLessThanOrEqual(2560 * 1440);
    expect(width * terms.height).toBe(height * terms.width);
    // The prompt's pixel floors are worked out against the nominal canvas, so the size must hold it.
    expect(width).toBeGreaterThanOrEqual(NOMINAL_SHEET_SIZE[aspect].width);
    expect(height).toBeGreaterThanOrEqual(NOMINAL_SHEET_SIZE[aspect].height);
  });

  it('gives the largest stable size of each shape', () => {
    if (GPT_IMAGE_LIMITS === null) throw new Error('GPT Image declares no request size.');
    const sizes = ASPECT_RATIOS.map((aspect) => requestSizeFor(ASPECT_RATIO_TERMS[aspect], GPT_IMAGE_LIMITS));
    expect(sizes).toEqual([
      { width: 2560, height: 1440 },
      { width: 1920, height: 1920 },
      { width: 1440, height: 2560 },
      { width: 2464, height: 1056 },
    ]);
  });
});

describe('requestSizeFor against limits no size can meet', () => {
  const LIMITS: RequestSizeLimits = {
    edgeMultiple: 16,
    maxEdge: 3840,
    minPixels: 655_360,
    maxPixels: 8_294_400,
    maxRatio: 3,
    stable: { width: 2560, height: 1440 },
  };

  it('refuses a ratio past the widest the vendor allows', () => {
    expect(requestSizeFor({ width: 4, height: 1 }, LIMITS)).toBeNull();
  });

  it('refuses a ratio whose largest size has too few pixels', () => {
    expect(requestSizeFor({ width: 16, height: 9 }, { ...LIMITS, minPixels: 4_000_000 })).toBeNull();
  });

  it('refuses a ratio no whole factor puts inside the edge limit', () => {
    // No pixel floor, so the only thing refusing it is that no step fits.
    expect(
      requestSizeFor({ width: 1, height: 1 }, { ...LIMITS, edgeMultiple: 64, maxEdge: 32, minPixels: 0 }),
    ).toBeNull();
  });
});
