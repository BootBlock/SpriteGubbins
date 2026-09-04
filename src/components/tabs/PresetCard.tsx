import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { spectrumStopAt } from '../../constants/spectrum.ts';
import { PRESET_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { PresetCardSpecs } from './PresetCardSpecs.tsx';
import { PresetDetailsForm } from './PresetDetailsForm.tsx';

interface PresetCardProps {
  readonly preset: PresetArchetype;
  /** Where in the library this card sits, which is what decides its stop on the wheel. */
  readonly index: number;
  readonly onLoad: (preset: PresetArchetype) => void;
  /** Resolves to whether the edit was stored, so a refused one keeps the editor open. */
  readonly onUpdateDetails: (preset: PresetArchetype, name: string, description: string) => Promise<boolean>;
  readonly onDelete: (preset: PresetArchetype) => void;
}

/**
 * One archetype in the library.
 *
 * Only the user's own presets offer an edit and a delete: a built-in is a compile-time constant
 * that is never stored, while a custom one is work the user did that nothing else holds a copy of —
 * which is why the delete confirms first and the edit does not need to.
 *
 * **Each card re-points `--color-tab` to its own stop on the wheel**, so the library reads as a
 * spectrum rather than a grid of one colour repeated. Which stops are on offer is `spectrumStopAt`'s
 * to decide, and it is nine rather than ten: the cyan stop is the live colour, which a card's edge,
 * bloom, heading and load button may not rest on any more than a whole view may.
 * Nothing below had to change for that: the
 * card's edge, its hover bloom, its title and its load button all reach for `*-tab` utilities, and
 * those resolve against whichever element last set the property. Assigning it here rather than
 * passing a colour down is what keeps a card's decoration out of its props — and it is why the
 * button needs no prop either: `action-tab` picks up the card's stop, not the presets view's.
 */
export function PresetCard({ preset, index, onLoad, onUpdateDetails, onDelete }: PresetCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // Focused *before* the state change, not after: the edit button never unmounts, so it can take
  // focus now and still hold it once the editor goes. Otherwise focus would fall to the document.
  const closeEditor = () => {
    editButtonRef.current?.focus();
    setIsEditing(false);
  };

  return (
    <li
      // Cast because `CSSProperties` enumerates the known CSS properties and a custom one is not
      // among them. It is the assertion React's own docs use for this, and it widens nothing: the
      // value is a `var()` reference produced by `spectrumStopAt`, not a colour written here.
      style={{ '--color-tab': spectrumStopAt(index) } as CSSProperties}
      // The edge carries the card's own stop at rest, not only under the pointer. A library where
      // the allocation is visible on hover alone is one where it may as well not exist: the grid is
      // read all at once, and the whole point of giving each card a position on the wheel is that
      // the set reads as a spectrum from across the room.
      className="animate-view-pop-in glass-panel group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-tab/35 p-5 shadow-xl transition-all duration-585 hover:-translate-y-1 hover:border-tab/80 hover:shadow-2xl"
    >
      {/* A bloom in the card's own colour, existing only under the pointer, behind its content. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-32 rounded-full bg-tab/25 opacity-0 blur-2xl transition-opacity duration-975 group-hover:opacity-100"
      />

      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="view">{preset.category}</Badge>
          <Badge>{preset.isCustom === true ? 'Your preset' : 'Built-in'}</Badge>
        </div>

        {isEditing ? (
          <PresetDetailsForm preset={preset} onUpdateDetails={onUpdateDetails} onClose={closeEditor} />
        ) : (
          <h3 className="text-base font-bold text-ink transition-colors duration-585 group-hover:text-tab">
            {preset.name}
          </h3>
        )}
        {/*
          The description where there is one, and the subject where there is not.

          Not both: the line is the card's one sentence, and a preset that describes itself has
          already said the useful half of "Human — Dark Fantasy". Every built-in carries a
          description, so the fallback is reached only by a preset of the user's own saved with the
          box left empty — and naming its species and setting is a better answer there than a gap.

          **Six lines, and that number is the copy's rather than the layout's.** The clamp is a
          guard against a description somebody pasted a paragraph into, not a budget the built-ins
          are written to: at the narrowest the card ever gets — three columns inside the page's
          `max-w-7xl` cap — a line holds about forty characters, so the 220 the presets are capped
          at needs six. Two was right for "species — setting", which never reached a third line;
          carrying that figure over to prose is what truncated every built-in description mid-clause.
        */}
        <p className="line-clamp-6 text-xs text-ink-muted">
          {preset.description === ''
            ? `${preset.subject.species} — ${preset.subject.setting}`
            : preset.description}
        </p>
        <PresetCardSpecs category={preset.category} output={preset.output} />
      </div>

      {isConfirmingDelete ? (
        <div className="relative flex gap-2">
          {/* `flex-1` travels with the button to the wrapper, which is the flex item in this row. */}
          <ControlTooltip
            hint={`Delete “${preset.name}”`}
            text={PRESET_ACTION_TOOLTIPS.confirmDeletePreset}
            className="relative flex flex-1"
          >
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(false);
                onDelete(preset);
              }}
              className="w-full rounded-xl bg-rose py-2 text-xs font-bold text-foundry-950 transition-opacity hover:opacity-90"
            >
              Delete “{preset.name}”
            </button>
          </ControlTooltip>
          <ControlTooltip hint="Cancel" text={PRESET_ACTION_TOOLTIPS.cancelDeletePreset}>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(false);
              }}
              className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
            >
              Cancel
            </button>
          </ControlTooltip>
        </div>
      ) : (
        <div className="relative flex gap-2">
          <ControlTooltip
            hint="Load preset"
            text={PRESET_ACTION_TOOLTIPS.loadPreset}
            className="relative flex flex-1"
          >
            <button
              type="button"
              onClick={() => {
                onLoad(preset);
              }}
              className="action-tab group/load flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-390 active:scale-[0.98]"
            >
              {/* Named group: the card is already a `group`, and an unnamed one here would follow the
                  card's hover rather than this button's. */}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-585 group-hover/load:scale-125"
              >
                ⚡
              </span>
              Load preset
            </button>
          </ControlTooltip>

          {preset.isCustom === true && (
            <>
              <ControlTooltip hint="Edit details" text={PRESET_ACTION_TOOLTIPS.editPresetDetails}>
                <button
                  ref={editButtonRef}
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  aria-label={`Edit details for preset ${preset.name}`}
                  className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-ink-muted transition-all duration-390 hover:-translate-y-px hover:border-tab/50 hover:bg-foundry-700 active:translate-y-0"
                >
                  <span aria-hidden="true">✏️</span>
                </button>
              </ControlTooltip>
              <ControlTooltip hint="Delete" text={PRESET_ACTION_TOOLTIPS.deletePreset}>
                <button
                  type="button"
                  onClick={() => {
                    // The editor would otherwise sit above a confirm asking to delete what it edits.
                    setIsEditing(false);
                    setIsConfirmingDelete(true);
                  }}
                  aria-label={`Delete preset ${preset.name}`}
                  className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-rose transition-all duration-390 hover:-translate-y-px hover:border-rose/50 hover:bg-foundry-700 active:translate-y-0"
                >
                  <span aria-hidden="true">🗑</span>
                </button>
              </ControlTooltip>
            </>
          )}
        </div>
      )}
    </li>
  );
}
