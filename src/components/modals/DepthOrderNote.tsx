import { resolveProjection } from '../../constants/categoryProjections.ts';
import { depthOrder, resolveCameraElevation } from '../../constants/promptText/index.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';

interface DepthOrderNoteProps {
  readonly run: SheetRun;
  /**
   * The subject's category, which is what the camera is resolved against. A run carries the
   * projection and elevation the studio holds, and a category the subject cannot be drawn under
   * degrades both before the compiler prints them.
   */
  readonly category: SubjectCategory;
}

/**
 * What one sheet's camera and coverage make of the depth order, in the notation a split row can hold.
 *
 * The prompt states this in markdown and the row states it in JSX, so both ask {@link depthOrder} and
 * neither decides the *shape* for itself: a plan view and a single-facing sheet settle the question
 * once, and a sheet drawing several facings answers once per facing. Counting `run.covered` here
 * instead would be a second decision about a sheet the two are both describing, free to disagree with
 * the prompt in the disclosure directly below it.
 *
 * **The camera is resolved rather than read.** Depth order is a near/far question, and directly
 * overhead there is no near side — so a row reading `DEPTH_ORDER_TEXT` would put “pieces on the left
 * render in front of the body” immediately above a prompt saying the pieces stack by height instead.
 *
 * **A paragraph per facing rather than a list**, even though the prompt writes bullets: the row this
 * sits in is itself one item of the drawer's own list, so a nested list puts a second set of list
 * items inside every row — five more for anything walking the drawer by role, a screen reader
 * announcing “list, 5 items” inside “list, 2 items”, and all of it bought for a bullet glyph. The
 * two shapes then also render as the same kind of thing as each other, which is the second reason.
 *
 * Its own file rather than a second component inside the row, which is the house rule, and it earns
 * that here: the row is otherwise a flat block of markup, and a branch between two shapes buried in
 * the middle of it is where the second shape stops being maintained.
 */
export function DepthOrderNote({ run, category }: DepthOrderNoteProps) {
  const order = depthOrder(
    run.covered,
    resolveCameraElevation(resolveProjection(category, run.output.projection), run.output.cameraElevation),
  );

  if (!order.perFacing) {
    return <p className="mb-3 text-xs leading-relaxed text-ink-muted">{order.text}</p>;
  }

  return (
    <div className="mb-3 space-y-1">
      {order.facings.map(({ facing, text }) => (
        <p key={facing} className="text-xs leading-relaxed text-ink-muted">
          {/* The facing leads the line, as it does in the prompt's own bullets: five sentences that
              each open by naming a camera relationship are five a reader has to decode before they
              can tell which view any of them is about. */}
          <span className="font-semibold text-ink">{facing}</span> — {text}
        </p>
      ))}
    </div>
  );
}
