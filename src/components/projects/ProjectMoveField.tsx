import { useRef, useState } from 'react';
import { keepFocusThrough } from '../../hooks/keepFocusThrough.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import type { Project } from '../../types/project.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { ProjectSelectField } from './ProjectSelectField.tsx';
import { Button } from '../common/Button.tsx';

interface ProjectMoveFieldProps {
  /** The project the save is filed under now. */
  readonly projectId: string;
  /**
   * The save, as the words that name it inside a sentence — `preset My Knight`, or `the saved
   * settings “Flat sheets”`. The dropdown's name follows it with `for`, and the Move button's with
   * `Move … to`, so every copy of both controls in a list names the save it acts on.
   */
  readonly subject: string;
  /** Guidance for the dropdown, which only chooses. */
  readonly tooltip: string;
  /** Guidance for the Move button, which is what re-files the save. */
  readonly moveTooltip: string;
  /** The store's move. Awaited, so the keyboard's next place is chosen from the page as it ends up. */
  readonly onMove: (projectId: string) => Promise<void>;
  /**
   * Why the save cannot move to `destination`, or `null` where it can. The store refuses the same
   * move by the same rule, so this is the reader being told before the press rather than after.
   */
  readonly refusalFor: (destination: Project) => string | null;
}

/**
 * The control on a saved row that re-files the save under another project: a dropdown that
 * chooses, and a Move button that commits the choice.
 *
 * **Two steps, because a native `<select>` cannot be one** (issue #354). A closed select fires
 * `change` on every arrow key in Chromium on Windows, and on every type-to-select letter on every
 * platform, so a move committed on `change` sent the save to the first project the keyboard passed
 * over. In the Projects view that also took the row off the list, and the focused select with it, so
 * the second arrow key went nowhere and the next Tab started from the top of the page. Choosing is
 * now free: the dropdown holds a draft, and only the button writes.
 *
 * **The button exists only while there is something to commit**, which is a draft naming a project
 * other than the save's own. A draft naming a project that has since been deleted is no choice at
 * all, so it is read as none rather than corrected in an effect, and choosing the save's own project
 * again is how a reader takes a choice back.
 *
 * **A project that already has the save's name gets a note instead of the button** (issue #454).
 * A name is unique inside one project, because saving and renaming pick their target by name, so
 * the move is refused. The note is a live region that stays mounted, so the reason is announced as
 * the choice is made rather than found by looking for a button that is not there.
 *
 * **Where the keyboard goes after the move** is `keepFocusThrough`'s answer. Where the row survives —
 * the Quantise tab lists every project's sets — the button has gone and the dropdown takes the focus,
 * now showing where the save is. Where it does not, the keyboard moves on to where the next Tab
 * would have gone. The Move button sits under the dropdown rather than beside it because the
 * quantiser's column budgets the dropdown's whole width for its longest option.
 */
export function ProjectMoveField({
  projectId,
  subject,
  tooltip,
  moveTooltip,
  onMove,
  refusalFor,
}: ProjectMoveFieldProps) {
  const projects = useProjectStore((state) => state.projects);
  const [draft, setDraft] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLButtonElement>(null);

  const destination = projects.find((project) => project.id === draft && project.id !== projectId);
  const refusal = destination === undefined ? null : refusalFor(destination);

  const move = (to: string) => {
    void keepFocusThrough({
      anchor: moveRef.current,
      act: () => onMove(to),
      settle: () => {
        setDraft(null);
      },
      // `SelectField` renders exactly one `<select>`, and this wrapper holds nothing else that is one.
      home: () => fieldRef.current?.querySelector('select') ?? null,
    });
  };

  return (
    <div ref={fieldRef}>
      <ProjectSelectField
        label="Project"
        tooltip={tooltip}
        value={destination?.id ?? projectId}
        nameQualifier={`for ${subject}`}
        onChange={setDraft}
      />

      {/* Spaced only while it says something, rather than hidden while empty: a live region taken out
          of the accessibility tree by `display: none` is not reliably announced when it fills. */}
      <p role="status" className="text-xs leading-relaxed text-ink-muted not-empty:mt-2">
        {refusal}
      </p>

      {destination !== undefined && refusal === null && (
        <div className="mt-2">
          <ControlTooltip hint={`Move to ${destination.name}`} text={moveTooltip}>
            <Button
              variant="secondary"
              size="sm"
              ref={moveRef}
              aria-label={`Move ${subject} to ${destination.name}`}
              onClick={() => {
                move(destination.id);
              }}
            >
              Move
            </Button>
          </ControlTooltip>
        </div>
      )}
    </div>
  );
}
