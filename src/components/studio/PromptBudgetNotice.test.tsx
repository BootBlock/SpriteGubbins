import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { PromptBudgetNotice } from './PromptBudgetNotice.tsx';
import type { TargetModelId } from '../../types/output.ts';

/**
 * Which of the two findings the studio puts in front of the reader, and whether it says anything at
 * all.
 *
 * Every case here is one the app reaches on its own: the prompts are the real thing, and the target
 * is a control the reader can change without touching anything else. What is being pinned is that
 * the notice answers the *state* of the target's budget rather than the presence of a number — the
 * defect it was re-cut for was a target carrying no number and therefore never speaking, while its
 * own description said its briefs were too long.
 */
const LONG_BRIEF = 'word '.repeat(4_000);

function renderFor(target: TargetModelId, prompt: string) {
  useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: target } });
  return render(<PromptBudgetNotice prompt={prompt} />);
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('PromptBudgetNotice', () => {
  it('warns a Seedream reader about lost detail, and does not claim the brief is cut', () => {
    // The finding the app could not previously make. ByteDance advise 600 English words and document
    // the model dropping details past that — they do not say it stops reading, so neither may this.
    renderFor('SEEDREAM', LONG_BRIEF);

    expect(screen.getByText('Past this target’s advised length')).toBeInTheDocument();
    expect(screen.getByText(/4000 words against an advised 600/)).toBeInTheDocument();
    expect(screen.getByText(/this target does read all of it/)).toBeInTheDocument();
    expect(screen.queryByText(/ceiling/)).toBeNull();
  });

  it('tells a Stable Diffusion reader the prompt will not arrive, which is a different finding', () => {
    // CLIP's 77 tokens is where the encoder stops, so here the warning is about arrival and the
    // wording has to say so. Sharing one sentence between the two states is the mistake the copy is
    // split to prevent.
    renderFor('STABLE_DIFFUSION', LONG_BRIEF);

    expect(screen.getByText('Over this target’s ceiling')).toBeInTheDocument();
    expect(screen.getByText(/against a documented 77/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing here trims it to fit/)).toBeInTheDocument();
  });

  it('says nothing for a target whose vendor published no figure', () => {
    // Silence means nobody stated one, never that Midjourney reads everything — which is why there
    // is no reassuring case in the copy for a reader to mistake for one.
    const { container } = renderFor('MIDJOURNEY', LONG_BRIEF);

    expect(container.querySelector('section')).toBeNull();
  });

  it('says nothing while a prompt is inside the figure it is measured against', () => {
    // The whole panel, not just the badge: a case asserting the badge string alone would pass while
    // the component rendered some other finding in its place.
    const { container } = renderFor('SEEDREAM', 'a short brief');

    expect(container.querySelector('section')).toBeNull();
  });

  it('announces through a live region that was already in the document', () => {
    // A region added at the same moment as its text is not reliably announced, so the wrapper is
    // rendered even while there is nothing to say. This catches someone "tidying" it into an early
    // return.
    const { container } = renderFor('MIDJOURNEY', LONG_BRIEF);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');
  });
});
