import type { GuidanceInline } from '../../types/guidanceMarkup.ts';
import { parseGuidanceMarkup } from '../../utils/parseGuidanceMarkup.ts';

interface GuidanceMarkupProps {
  /** A guidance card’s text, in the Markdown subset `parseGuidanceMarkup` reads. */
  readonly text: string;
}

/** One block’s runs, as React nodes. Keyed by position, because a card’s text never reorders. */
function Inlines({ runs }: { readonly runs: readonly GuidanceInline[] }) {
  return runs.map((run, index) => {
    const key = String(index);
    if (run.kind === 'text') return <span key={key}>{run.text}</span>;
    if (run.kind === 'code') {
      return (
        <code key={key} className="rounded-sm bg-foundry-950/60 px-1 font-mono text-2xs text-ink">
          {run.text}
        </code>
      );
    }
    if (run.kind === 'strong') {
      return (
        <strong key={key} className="font-semibold text-ink">
          <Inlines runs={run.children} />
        </strong>
      );
    }
    return (
      <em key={key} className="italic">
        <Inlines runs={run.children} />
      </em>
    );
  });
}

/**
 * A guidance card’s text, set as paragraphs and lists with code, bold and italics inside them.
 *
 * **Every element is phrasing content**, spans set to `block` rather than `<p>` and `<ul>`, because
 * the card is a DOM descendant of its trigger’s row and that row is often a `<label>` or a `<button>`,
 * where a paragraph or a list is invalid markup. The list keeps its semantics through `role="list"`
 * and `role="listitem"`, and its bullets are `aria-hidden` so the card’s accessible description reads
 * the words alone.
 *
 * Each block closes on a space the eye cannot see, so the description a screen reader builds out of
 * the card’s text keeps a gap between two paragraphs rather than running one sentence into the next.
 */
export function GuidanceMarkup({ text }: GuidanceMarkupProps) {
  return (
    <span className="flex flex-col gap-2">
      {parseGuidanceMarkup(text).map((block, index) =>
        block.kind === 'paragraph' ? (
          <span key={String(index)} className="block">
            <Inlines runs={block.children} />{' '}
          </span>
        ) : (
          <span key={String(index)} role="list" className="flex flex-col gap-1">
            {block.items.map((item, itemIndex) => (
              <span key={String(itemIndex)} role="listitem" className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent-soft" />
                <span>
                  <Inlines runs={item} />{' '}
                </span>
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
