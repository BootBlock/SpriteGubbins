import { DUPLICATE_TOLERANCE_RANGE, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { DUPLICATE_GUIDANCE } from '../../constants/spriteDuplicates.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteDuplicateGroup, SpriteSegmentation } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { RangeField } from '../common/RangeField.tsx';

interface DuplicateControlsProps {
  /**
   * What the sheet broke into, or `null` while there is no result.
   *
   * Read only to tell "no sprites to compare" from "sprites compared, none alike" — two states an
   * empty group list cannot separate, and the first of which is a fact about the *keying* that the
   * panel above already diagnoses.
   */
  readonly sprites: SpriteSegmentation | null;
  /** The groups the reading found, or `null` while there is no result to have found any. */
  readonly duplicates: readonly SpriteDuplicateGroup[] | null;
  /**
   * Whether the result on screen has had those groups folded into one drawing apiece.
   *
   * The transform's own answer rather than the snap dial beside it, and the two part company for as
   * long as a job is in flight: the dial is where the reader has just put it, and the result is what
   * the position before it produced. See `QuantiseResult.snapped`.
   */
  readonly snapped: boolean;
  /** Whether a newer result is on its way, which the figures here would otherwise be read as. */
  readonly busy: boolean;
}

/**
 * Which sprites on the sheet are the same drawing, and whether the repeats are folded into one.
 *
 * The second of the two panels that change no pixel by *reading* and one that does by *acting*: the
 * tolerance is a reading, like the sprite gap above it, while the snap rewrites the sheet. That is
 * why they sit together and why the snap's guidance says outright what it deletes — a reader
 * skimming a stack of dials has no other way to tell the two kinds apart.
 *
 * **It reports the finding, never the sheet's current state.** `QuantiseResult.duplicates` describes
 * the sheet as the reading found it, so the counts stay put when the snap is switched on and the
 * paragraph is what says the fold has happened. The alternative — re-reading after the fold — would
 * report a set of exact groups and lose the only record of what the dial did.
 *
 * The group list is the panel's answer to a count nobody can act on. "Three groups" says a sheet has
 * repeats and not *which*, and the preview's Sprites mode draws every box alike — so each group
 * names its size and where its first sprite sits, which is enough to find it at 1:1.
 */
export function DuplicateControls({ sprites, duplicates, snapped, busy }: DuplicateControlsProps) {
  const duplicateTolerance = useQuantiseStore((state) => state.duplicateTolerance);
  const duplicateSnap = useQuantiseStore((state) => state.duplicateSnap);
  const setDuplicateTolerance = useQuantiseStore((state) => state.setDuplicateTolerance);
  const setDuplicateSnap = useQuantiseStore((state) => state.setDuplicateSnap);

  const segmented = sprites?.kind === 'SEGMENTED';
  const groups = duplicates ?? [];
  const redundant = groups.reduce((total, group) => total + group.duplicates.length, 0);
  const identical = groups.reduce(
    (total, group) => total + group.duplicates.filter((member) => member.exact).length,
    0,
  );

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Duplicates</p>
        {busy || duplicates === null ? (
          <Badge tone={busy ? 'live' : 'neutral'}>
            {busy ? 'Comparing the sprites…' : 'Nothing quantised yet'}
          </Badge>
        ) : (
          <>
            <Badge tone={!segmented ? 'neutral' : groups.length === 0 ? 'valid' : 'attention'}>
              {countLabel(segmented, groups.length, redundant)}
            </Badge>
            {identical > 0 && <Badge tone="attention">{identical} identical</Badge>}
            {snapped && <Badge tone="valid">Folded into one drawing</Badge>}
          </>
        )}
      </div>

      {/* Withdrawn while a newer result is coming, exactly as the sprite panel's figures are: the
          previous job's groups name positions that a moved dial may already have changed, and a list
          of bare coordinates has nothing to say it is the old one. */}
      {!busy && groups.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono text-2xs text-ink-faint">
          {groups.map((group) => (
            <li key={`${String(group.canonical.left)},${String(group.canonical.top)}`}>
              {group.canonical.width} × {group.canonical.height} at {group.canonical.left},{' '}
              {group.canonical.top} · {group.duplicates.length + 1} sprites ·{' '}
              {group.duplicates.every((member) => member.exact)
                ? 'all identical'
                : `${String(group.duplicates.filter((member) => member.exact).length)} identical`}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
        <RangeField
          label="Duplicate tolerance"
          tooltip={QUANTISE_TOOLTIPS.duplicateTolerance}
          value={duplicateTolerance}
          min={DUPLICATE_TOLERANCE_RANGE.min}
          max={DUPLICATE_TOLERANCE_RANGE.max}
          step={DUPLICATE_TOLERANCE_RANGE.step}
          // `identical only` rather than `off`, for the reason the sprite gap spells no `off`
          // either: at zero the comparison still runs and still groups the frames that match pixel
          // for pixel, so calling it off would claim something the pipeline does not do.
          format={(value) => (value === 0 ? 'identical only' : String(value))}
          onChange={setDuplicateTolerance}
        />
        <CheckboxField
          label="Snap duplicates to the first of each group"
          tooltip={QUANTISE_TOOLTIPS.duplicateSnap}
          checked={duplicateSnap}
          // Named rather than merely greyed, and the two reasons are different actions: no sheet is
          // a wait, no groups is a tolerance to raise. Neither is the control being unavailable in
          // the sense a missing capability is, so the sentence says what would give it something to
          // do.
          disabledReason={disabledReason(duplicates, segmented, groups.length)}
          onChange={setDuplicateSnap}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {guidanceFor(duplicates, segmented, groups.length, snapped)}
      </p>
    </section>
  );
}

/** `No repeated sprites`, `2 groups — 3 repeats`, or that there was nothing to compare. */
function countLabel(segmented: boolean, groups: number, redundant: number): string {
  if (!segmented) return 'No sprites to compare';
  if (groups === 0) return 'No repeated sprites';
  return `${String(groups)} ${groups === 1 ? 'group' : 'groups'} — ${String(redundant)} ${redundant === 1 ? 'repeat' : 'repeats'}`;
}

/** Why the snap has nothing to do, or empty where it has. */
function disabledReason(
  duplicates: readonly SpriteDuplicateGroup[] | null,
  segmented: boolean,
  groups: number,
): string {
  if (duplicates === null) return 'Quantise a sheet first — there is nothing to compare yet.';
  if (!segmented) return 'No sprites have been separated on this sheet, so none can be compared.';
  if (groups === 0) return 'Nothing was grouped at the tolerance in force, so there is nothing to fold.';
  return '';
}

/** Which paragraph the state calls for — see `DUPLICATE_GUIDANCE`, which holds all four. */
function guidanceFor(
  duplicates: readonly SpriteDuplicateGroup[] | null,
  segmented: boolean,
  groups: number,
  snapped: boolean,
): string {
  // With nothing quantised yet the found paragraph is the right one: it says what this panel does,
  // where naming a state the sheet is not in would describe a finding nobody has made.
  if (duplicates === null) return DUPLICATE_GUIDANCE.found;
  if (!segmented) return DUPLICATE_GUIDANCE.unsegmented;
  if (groups === 0) return DUPLICATE_GUIDANCE.none;
  return snapped ? DUPLICATE_GUIDANCE.snapped : DUPLICATE_GUIDANCE.found;
}
