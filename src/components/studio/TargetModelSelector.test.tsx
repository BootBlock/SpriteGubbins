import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { TARGET_MODELS } from '../../constants/models.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { TargetModelSelector } from './TargetModelSelector.tsx';

/**
 * That each target's own explanation actually reaches the screen.
 *
 * `tests/target-model-fields.test.ts` guards the shape of the failure this fixes — a field declared
 * on every entry and read by nothing — but it can only see that the name is *mentioned*. A consumer
 * that looked the description up and then dropped it would satisfy that check and leave the user
 * exactly where they were, so the rendering is asserted here, against the real entries rather than a
 * fixture: these eleven strings are the content, and a test written against invented ones would pass
 * while the shipped copy was missing.
 */
const LABEL = '3. Target AI Generator';

function selector(): HTMLElement {
  return screen.getByRole('combobox', { name: LABEL });
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('TargetModelSelector', () => {
  it.each(TARGET_MODELS)('shows what choosing $name does to the prompt', (model) => {
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: model.id } });
    render(<TargetModelSelector />);

    expect(screen.getByText(model.description)).toBeInTheDocument();
  });

  it('describes the select with the chosen target’s explanation, not with loose text beside it', () => {
    // The association is the whole point of putting it in `SelectField` rather than in the panel: a
    // paragraph that merely follows the control says nothing, to a reader who cannot see the two
    // together, about *which* option it is describing.
    const midjourney = TARGET_MODELS.find((model) => model.id === 'MIDJOURNEY');
    // Resolved before rendering, and thrown on rather than passed along: `toHaveAccessibleDescription`
    // called with `undefined` asserts only that *some* description exists, so a missing entry would
    // turn this into a test that passes for the wrong reason.
    if (!midjourney) throw new Error('the table should carry an entry for Midjourney.');

    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: midjourney.id } });
    render(<TargetModelSelector />);

    expect(selector()).toHaveAccessibleDescription(midjourney.description);
  });

  it('swaps the explanation when the target changes', () => {
    // The failure this catches is a description captured once at mount — which looks correct on
    // first paint and goes stale on the first change, exactly as a mirrored derivation does.
    const [first, second] = [TARGET_MODELS[0], TARGET_MODELS[1]];
    if (!first || !second) throw new Error('the table should offer at least two targets.');

    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: first.id } });
    render(<TargetModelSelector />);

    act(() => {
      useOutputStore.getState().setOutputField('targetModel', second.id);
    });

    expect(screen.getByText(second.description)).toBeInTheDocument();
    expect(screen.queryByText(first.description)).not.toBeInTheDocument();
    expect(selector()).toHaveAccessibleDescription(second.description);
  });
});

describe('the generator link beside the target model', () => {
  it.each(TARGET_MODELS.filter((model) => model.generatorSite.kind === 'PUBLIC'))(
    'opens $name in a new tab',
    (model) => {
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: model.id } });
      render(<TargetModelSelector />);

      const link = screen.getByRole('link', { name: `Open ${model.name} in a new tab` });
      // The URL as the entry states it, not merely that some link exists: a button pointing at the
      // wrong vendor is the failure a presence check passes.
      expect(link).toHaveAttribute(
        'href',
        model.generatorSite.kind === 'PUBLIC' ? model.generatorSite.url : '',
      );
      expect(link).toHaveAttribute('target', '_blank');
      // The app is installable, so a link followed in place strands the reader in a chromeless
      // window — and the opened page has no business reaching back through `window.opener`.
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    },
  );

  it.each(TARGET_MODELS.filter((model) => model.generatorSite.kind === 'NONE'))(
    'offers $name a disabled control rather than no control',
    (model) => {
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: model.id } });
      render(<TargetModelSelector />);

      // A control that disappeared as the select changed would say nothing about *why* there is
      // nowhere to go, which for two of these three is the finding that they are weights you run
      // yourself.
      expect(
        screen.getByRole('button', { name: `${model.name} has no generator site to open` }),
      ).toBeDisabled();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    },
  );
});
