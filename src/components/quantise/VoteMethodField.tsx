import { QUANTISE_TOOLTIPS, VOTE_METHOD_CHOICES } from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { SelectField } from '../common/SelectField.tsx';

/**
 * The Downscale control: which cell reading turns the mesh into pixels.
 *
 * A `SelectField` rather than pills, following the field's own precedent — every tool this tab
 * learned from offers its samplers as a small enum in a dropdown, and the three readings here are
 * genuinely different algorithms rather than positions on a dial. It consumes the store directly
 * with atomic selectors, as every control over cross-tab state does; the choice is per-workflow
 * rather than per-sheet, so it survives a new image and falls with Clear — the store says why.
 */
export function VoteMethodField() {
  const vote = useQuantiseStore((state) => state.vote);
  const setVote = useQuantiseStore((state) => state.setVote);

  return (
    <SelectField
      label="Downscale"
      tooltip={QUANTISE_TOOLTIPS.vote}
      value={vote}
      choices={VOTE_METHOD_CHOICES}
      onChange={setVote}
    />
  );
}
