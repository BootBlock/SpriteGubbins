import { Fragment } from 'react';
import { IDENTITY_PALETTE_LABEL, IDENTITY_SUBJECT_SEGMENTS } from '../../constants/identityLock.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { withSegments } from '../../utils/identityDigest.ts';
import { identitySubjectSegments } from '../../utils/identitySubject.ts';

/**
 * Writes what the studio already knows about the subject into the identity lock above it.
 *
 * The sibling of `IdentityPaletteCapture`, and the half of `baseline-prompt-new.md` §5's digest that
 * needs no image at all: section 1 of the prompt is compiled from these same fields, so the prose a
 * lock wants is largely a restatement of answers the user has already given. It is offered first
 * because it comes first — this is what a digest can say *before* a sheet exists, and the palette is
 * what an accepted one adds to it.
 *
 * Both controls fold through `withSegments`, so each replaces only its own labelled segments and
 * leaves the other's — and the user's own prose — where it was.
 *
 * No dashed border, unlike the capture beside it: dashed means a file may be dropped here, and
 * nothing may be dropped on this one.
 */
export function IdentitySubjectDigest() {
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const showToast = useUIStore((state) => state.showToast);

  function handleClick() {
    // Read at click time rather than subscribed, exactly as the palette capture reads the lock: the
    // subject changes on every keystroke in the panel above, and a component that re-rendered with
    // it would be re-rendering the continuity group for an answer only this handler ever asks for.
    // Only the segments with something to say are folded. A segment whose fields the user has since
    // cleared is left where it stands rather than removed, because by then it is very likely *their*
    // line: the guidance below asks them to edit these into concrete detail from the sheet they
    // accepted, and clearing a field in the panel above must not delete what they wrote here. It is
    // the same call the palette capture makes for a sheet with nothing on it but its key field —
    // pressing a control should never silently destroy prose — and it is what makes "rewrites those
    // lines and nothing else" literally true.
    const stated = identitySubjectSegments(useSubjectStore.getState().subject).filter(
      (segment) => segment.value !== '',
    );

    if (stated.length === 0) {
      showToast('The subject has none of those fields filled in — the identity lock is unchanged');
      return;
    }

    setOutputField('identityLock', withSegments(useOutputStore.getState().output.identityLock, stated));
    showToast(
      `Wrote ${String(stated.length)} ${stated.length === 1 ? 'line' : 'lines'} describing the subject into the identity lock`,
    );
  }

  return (
    <section className="rounded-xl border border-foundry-600 bg-foundry-800/60 p-3">
      <button
        type="button"
        onClick={handleClick}
        className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98]"
      >
        Describe the subject
      </button>

      {/* The labels are read from the constant rather than written out again: they are what the
          button actually produces, and a paragraph naming a segment the fold no longer writes is
          precisely the kind of drift nothing would catch. */}
      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Restates the subject definition in the lock above as{' '}
        {IDENTITY_SUBJECT_SEGMENTS.map(({ label }, index) => (
          <Fragment key={label}>
            {index > 0 && (index === IDENTITY_SUBJECT_SEGMENTS.length - 1 ? ' and ' : ', ')}
            <span className="font-mono">{label}</span>
          </Fragment>
        ))}{' '}
        lines, leaving your own prose and the <span className="font-mono">{IDENTITY_PALETTE_LABEL}</span> line
        alone. It is a starting point rather than the finished digest: what holds a series together is
        concrete, countable detail from the sheet you accepted — “three amber chest lights in a vertical row”
        — so edit these into that. Pressing it again rewrites those lines and nothing else.
      </p>
    </section>
  );
}
