import { useMemo, useRef, useState } from 'react';
import { TARGET_MODEL_ENTRIES } from '../../constants/targetModelEntries.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useSheetSubject } from '../../hooks/useSheetSubject.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { OutputConfig } from '../../types/output.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { PromptActionButton } from './PromptActionButton.tsx';

interface CopyOpenNextButtonProps {
  /** The compiled prompt the preview shows, which is what a final press is remembered by. */
  readonly promptText: string;
}

/** The studio as it stood at a press that had no sheet to move on to. */
interface SpentPress {
  readonly promptText: string;
  readonly output: OutputConfig;
}

/**
 * Copy Prompt, Open generator and Next sheet in one press (issue #307), beside the preview's own
 * Copy Prompt.
 *
 * **It follows the sheet the studio is on, never the history.** A reader works through a batch,
 * steps back to the first sheet, changes a setting and works through it again — and every sheet of
 * that second pass may already read as copied, so a button that skipped to the first uncopied sheet
 * would skip the lot. What stops the same prompt going twice is the step itself: every press on a
 * sheet with a successor moves the studio to it, so the prompt it copies next is a different one.
 *
 * **A press with nowhere to step spends the button** — the last sheet of a batch, or a configuration
 * that is one sheet. It remembers the prompt and the output configuration it was pressed on, and it
 * stays unavailable while both are what they were. Any change to the prompt, or any step (which writes
 * a new configuration object even when it lands back on this sheet), gives it back. The memory is
 * this component's own state, because it guards against a stray second press and nothing else: a
 * reader who leaves the studio and comes back has made a deliberate return, not a double click.
 *
 * **The copy is awaited before the tab opens.** `navigator.clipboard.writeText` refuses a document
 * that has lost focus, and a tab opened first takes the focus before the write can finish. Opening
 * after the await stays inside the press's transient activation, which lasts seconds against a
 * clipboard write that takes milliseconds, so the popup blocker still sees a user gesture.
 *
 * **The step is skipped if the studio moved while the copy was in flight**, since writing the
 * successor computed at the press would then undo whatever the reader did in between.
 */
export function CopyOpenNextButton({ promptText }: CopyOpenNextButtonProps) {
  const category = useSubjectStore((state) => state.category);
  const subject = useSheetSubject();
  const output = useOutputStore((state) => state.output);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);
  const copyPrompt = useCopyPrompt();

  const [spent, setSpent] = useState<SpentPress | null>(null);
  // A press in flight, so a double click cannot copy the same sheet twice before the step lands. A
  // ref rather than state, because nothing on screen changes for the milliseconds it is set.
  const pending = useRef(false);

  const { sheets, ordinal } = useMemo(
    () => sheetBatch(category, subject, output),
    [category, subject, output],
  );
  const next = sheets[ordinal];
  const site = TARGET_MODEL_ENTRIES.get(output.targetModel)?.generatorSite;
  const siteUrl = site?.kind === 'PUBLIC' ? site.url : null;

  const isSpent = spent !== null && spent.promptText === promptText && spent.output === output;
  const label = ['Copy', siteUrl !== null && 'open', next !== undefined && 'next']
    .filter((part) => part !== false)
    .join(', ')
    .replace(/, (?=[^,]*$)/, ' & ');

  const guidance = [
    STUDIO_ACTION_TOOLTIPS.copyOpenNext,
    siteUrl === null && STUDIO_ACTION_TOOLTIPS.copyOpenNextNoSite,
    isSpent && STUDIO_ACTION_TOOLTIPS.copyOpenNextSpent,
  ]
    .filter((sentence) => sentence !== false)
    .join(' ');

  const press = async () => {
    if (isSpent || pending.current) return;
    const pressedOn = output;
    pending.current = true;
    const copied = await copyPrompt();
    pending.current = false;
    if (!copied) return;

    if (siteUrl !== null) window.open(siteUrl, '_blank', 'noopener,noreferrer');
    if (next === undefined) setSpent({ promptText, output: pressedOn });
    else if (useOutputStore.getState().output === pressedOn) setOutputConfig(next.output);
  };

  return (
    <ControlTooltip hint={label} text={guidance}>
      <PromptActionButton
        icon="⏭"
        unavailable={isSpent}
        onClick={() => {
          void press();
        }}
      >
        {label}
      </PromptActionButton>
    </ControlTooltip>
  );
}
