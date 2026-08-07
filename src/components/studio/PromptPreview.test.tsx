import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { countWords, generatePrompt } from '../../utils/promptCompiler.ts';
import { PromptPreview } from './PromptPreview.tsx';

/**
 * The preview is where the specification's first ban actually bites: the prompt, the word count and
 * the token estimate must be *derived*, never mirrored into state through an effect. A mirror looks
 * identical on first paint and only diverges after an edit — so every assertion here is made twice,
 * before and after changing the studio.
 */
function promptBox(): HTMLElement {
  const box = document.querySelector('pre');
  if (!(box instanceof HTMLElement)) throw new Error('the prompt box should be rendered.');
  return box;
}

/** What the compiler says the prompt should be, for whatever the stores currently hold. */
function expectedPrompt(): string {
  const { category, subject } = useSubjectStore.getState();
  return generatePrompt(category, subject, useOutputStore.getState().output);
}

beforeEach(() => {
  useSubjectStore.setState({ category: DEFAULT_PRESET.category, subject: DEFAULT_PRESET.subject });
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useUIStore.getState().dismissToast();
});

describe('PromptPreview', () => {
  it('renders exactly what the compiler produced', () => {
    render(<PromptPreview />);
    expect(promptBox().textContent).toBe(expectedPrompt());
  });

  it('recompiles when a subject field changes', () => {
    render(<PromptPreview />);

    act(() => {
      useSubjectStore.getState().setField('species', 'Sentient Filing Cabinet');
    });

    expect(promptBox().textContent).toContain('Sentient Filing Cabinet');
    expect(promptBox().textContent).toBe(expectedPrompt());
  });

  it('recompiles when the target model changes, which rewraps the whole prompt', () => {
    render(<PromptPreview />);
    const beforeSwitch = promptBox().textContent;

    act(() => {
      useOutputStore.getState().setOutputField('targetModel', 'MIDJOURNEY');
    });

    // Midjourney appends command flags, so the text must have changed shape rather than just wording.
    expect(promptBox().textContent).toContain('--style raw');
    expect(promptBox().textContent).not.toBe(beforeSwitch);
    expect(promptBox().textContent).toBe(expectedPrompt());
  });

  it('keeps the word count in step with the prompt it is counting', () => {
    render(<PromptPreview />);
    expect(screen.getByText(String(countWords(expectedPrompt())))).toBeInTheDocument();

    act(() => {
      // A directional mode change alters the component-count prose in several places, so the count
      // moves by more than one — a stale mirror could not coincidentally still match.
      useOutputStore.getState().setOutputField('directionalMode', 'SINGLE_DIRECTION_POSE_LIBRARY');
    });

    expect(screen.getByText(String(countWords(expectedPrompt())))).toBeInTheDocument();
  });

  it('marks itself live, in the colour reserved for live state', () => {
    render(<PromptPreview />);
    // Cyan is the palette's live signal; an ordinary indigo chip here would lose that distinction.
    expect(screen.getByText('Auto-Sync')).toHaveClass('text-neon');
  });
});
