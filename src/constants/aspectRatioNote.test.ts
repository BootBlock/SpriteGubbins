import { describe, expect, it } from 'vitest';
import { aspectRatioNote } from './aspectRatioNote.ts';
import { TARGET_MODELS } from './models.ts';

/**
 * That the Aspect Ratio control names the size to request on the one target whose request decides
 * the canvas, and says nothing on a target whose prompt does.
 */
describe('aspectRatioNote', () => {
  it('declares a request size on GPT Image alone', () => {
    expect(
      TARGET_MODELS.filter((model) => model.capabilities.canvas.kind === 'REQUEST_SIZE').map(
        (model) => model.id,
      ),
    ).toEqual(['GPT_IMAGE']);
  });

  it('tells a GPT Image reader the size for the chosen canvas', () => {
    expect(aspectRatioNote('GPT_IMAGE', 'WIDE_16_9')).toContain('Set size to “2560x1440”');
    expect(aspectRatioNote('GPT_IMAGE', 'ULTRAWIDE_21_9')).toContain('Set size to “2464x1056”');
  });

  it.each(TARGET_MODELS.filter((model) => model.id !== 'GPT_IMAGE').map((model) => model.id))(
    'says nothing on %s',
    (target) => {
      expect(aspectRatioNote(target, 'WIDE_16_9')).toBe('');
    },
  );
});
