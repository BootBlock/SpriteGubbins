import { useState } from 'react';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { isShippedRigContract } from '../../utils/isShippedRigContract.ts';
import { parseRigContract } from '../../utils/parseRigContract.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { FilePickerField } from '../common/FilePickerField.tsx';
import { Button } from '../common/Button.tsx';

/**
 * Loading the engine's own rig, so the prompt states the geometry rather than guessing at it.
 *
 * **The one control here that reads a file another program wrote.** Everything else in this panel is
 * a choice between values this app offers; this takes a rig contract — the file an engine's rig
 * tooling exports — and hands section 4 its piece names and section 5 their sizes and joints. What
 * that is worth is in the guidance behind the chooser.
 *
 * **A contract can also arrive without the reader touching this control**, because a preset carries
 * one and the Unsung Saviour rig preset ships a copy of that game's. On screen the two are the same
 * sentence, and one of them is a transcription that cannot know when its rig moved — so the line
 * below says which is in force. See `isShippedRigContract`, and `constants/presets/unsungSaviourRig.ts`
 * for why a copy is shipped at all.
 *
 * **A refused file says why, and changes nothing.** A contract that will not load is the one outcome
 * a reader cannot act on without being told which part of it is wrong, and dropping the loaded one
 * to make room for a broken one would lose work to a mis-click. So the problems are listed and the
 * configuration is left exactly as it was.
 *
 * The problems are `useState` rather than store state on purpose: they describe *the last file this
 * control was handed*, which is not part of the sheet and has no business surviving a preset save, a
 * history entry or a tab change.
 */
interface RigContractFieldProps {
  /**
   * Whether the sheet on screen is the one the contract describes.
   *
   * A contract is carried by the whole configuration, and a deliverable is several sheets: a
   * character's core sheet draws whole figures and its rig sheet draws the pieces. Only the second
   * is the one a rig has anything to say about, so on the first the control says so rather than
   * implying the sizes below are reaching the prompt.
   */
  readonly appliesToSheet: boolean;
}

export function RigContractField({ appliesToSheet }: RigContractFieldProps) {
  const rigContract = useOutputStore((state) => state.output.rigContract);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const [problems, setProblems] = useState<readonly string[]>([]);

  const acceptFile = (file: File | null | undefined) => {
    if (file === null || file === undefined) return;
    void file
      .text()
      .then((text) => {
        const reading = parseRigContract(JSON.parse(text));
        setProblems(reading.problems);
        if (reading.contract !== null) setOutputField('rigContract', reading.contract);
      })
      .catch(() => {
        // Everything the chain can throw lands here, and the reader is told one thing: a file that
        // will not read and a file that is not JSON are the same event to them — the file they
        // chose did not become a contract — and neither has a different next step.
        setProblems(['This file could not be read as JSON, so nothing was taken from it.']);
      });
  };

  return (
    <div className="flex flex-col gap-2">
      <FilePickerField
        label="Rig Contract"
        tooltip={STUDIO_ACTION_TOOLTIPS.loadRigContract}
        acceptFile={acceptFile}
        accept="application/json,.json"
      />

      {rigContract !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs leading-relaxed text-ink-muted">
            {rigContract.skeleton_name === '' ? 'A rig' : rigContract.skeleton_name} —{' '}
            {rigContract.slots.length} {rigContract.slots.length === 1 ? 'piece' : 'pieces'} in a{' '}
            {rigContract.frame_size.width} × {rigContract.frame_size.height} frame.{' '}
            {appliesToSheet
              ? 'The inventory, the piece names and the target size come from it.'
              : 'This sheet does not draw the rig’s pieces, so nothing here reads it — choose the rig sheet under Sheet Contents.'}{' '}
            {isShippedRigContract(rigContract) &&
              'This is the copy its preset ships, not a file you loaded — export the rig again if it has moved since.'}
          </p>
          <ControlTooltip hint="Remove" text={STUDIO_ACTION_TOOLTIPS.removeRigContract}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setOutputField('rigContract', null);
                setProblems([]);
              }}
            >
              Remove
            </Button>
          </ControlTooltip>
        </div>
      )}

      {/*
        A live region, because the refusal arrives after the file is read rather than in response to
        the press: nothing moves on screen at the moment the reader acts, so a screen reader would
        otherwise announce nothing at all.

        **Rendered always, with only its contents conditional** — the rule `Toast` and
        `SpriteCellControls` state at their own call sites: a region inserted into the document in
        the same commit as its text is not reliably announced, so a region that appears with the
        first refusal announces nothing, which is the whole of what it was added for. Empty it
        costs nothing: it has no padding and no children.
      */}
      <ul aria-live="polite" className="flex flex-col gap-1 text-xs leading-relaxed text-rose">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}
