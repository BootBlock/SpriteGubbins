import { OutputConfig } from '../studio/OutputConfig.tsx';
import { PromptPreview } from '../studio/PromptPreview.tsx';
import { SubjectForm } from '../studio/SubjectForm.tsx';
import { TargetModelSelector } from '../studio/TargetModelSelector.tsx';

/**
 * The studio: what to draw on the left, what comes out on the right.
 *
 * Inputs and output side by side rather than stacked, and the output column sticks as the form
 * scrolls, because the whole point of the compiler being live is watching the prompt change while
 * editing the thing that changes it.
 *
 * Composition only — every panel here reaches into the stores itself, so nothing is threaded through
 * this file and it never has to change when a panel does.
 */
export function StudioTab() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-5">
        <SubjectForm />
        <OutputConfig />
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-7">
        <TargetModelSelector />
        <PromptPreview />
      </div>
    </div>
  );
}
