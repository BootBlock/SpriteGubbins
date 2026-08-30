import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import type { GeneratorSite } from '../../types/output.ts';

interface GeneratorSiteLinkProps {
  /** The chosen target's own name, which is what the control's accessible name is built from. */
  readonly name: string;
  /** Where that target can be generated with, or the finding that there is nowhere. */
  readonly site: GeneratorSite;
}

/**
 * The button beside the target-model select that opens that generator's own image page.
 *
 * A prompt is composed here and used somewhere else, and until this existed the app said which
 * generator it had been written for without saying where that generator is. The link goes to the
 * *generation* surface rather than the vendor's front page — ChatGPT Images, Midjourney's Create
 * page, the BFL Playground — because the next thing a reader does after Copy Prompt is paste it.
 *
 * **Four of the eleven targets have nowhere to open**, and the button stays rather than
 * disappearing: two of them are open weights people run themselves, the third names no model at all,
 * and the fourth is an API endpoint whose vendor runs no page in front of it. Each is a finding the
 * reader cannot infer from the name, and a control that comes and goes as the select changes says
 * nothing about why. So the `NONE` state renders the same button disabled, carrying that entry's own
 * note in its guidance. See {@link GeneratorSite}.
 *
 * **An anchor, not a button with a handler**, because it is navigation: it opens in a new context
 * for the reason `ExternalLink` does — the app is installable, and in `standalone` display mode a
 * link followed in place strands the reader in a chromeless window with no way back. It is not
 * routed through `ExternalLink` itself, which is a text link for prose, underlined and inline; this
 * is a control on a form row, sized to the select beside it.
 */
export function GeneratorSiteLink({ name, site }: GeneratorSiteLinkProps) {
  if (site.kind === 'NONE') {
    return (
      <ControlTooltip
        className="relative inline-flex shrink-0"
        hint={HINT}
        // The entry's own finding, after the sentence that is the same for every target. A reader
        // who meets a disabled control is owed the reason for *this* target, and that reason is a
        // checkable claim recorded beside the target in `constants/models.ts` rather than here.
        text={`${STUDIO_ACTION_TOOLTIPS.openGenerator} ${site.note}`}
      >
        <button
          type="button"
          disabled
          aria-label={`${name} has no generator site to open`}
          className={BUTTON}
        >
          <span aria-hidden="true">↗</span>
        </button>
      </ControlTooltip>
    );
  }

  return (
    <ControlTooltip
      className="relative inline-flex shrink-0"
      hint={HINT}
      text={STUDIO_ACTION_TOOLTIPS.openGenerator}
    >
      <a
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${name} in a new tab`}
        className={BUTTON}
      >
        <span aria-hidden="true">↗</span>
      </a>
    </ControlTooltip>
  );
}

/** The heading on the guidance card, shared by both states so they read as one control. */
const HINT = 'Open generator';

/**
 * The control's styling, written once because the two states are one button in two conditions.
 *
 * **The width is fixed and it is budgeted.** `SelectField` lays this out on the same row as the
 * `<select>`, which truncates the tail of its selected option rather than wrapping, so what this
 * takes off the control is what a label loses — `tests/columnSplit.ts` reads the figure out of this
 * very class string, and `tests/studio-column-width.test.ts` holds the studio's two-column split to
 * the wider column it needs. Changing it here recomputes both.
 *
 * The height matches the select's own: 10px of padding either side of a 13px line, plus its border.
 * The disabled state names a token rather than reaching for an opacity and puts the hover back where
 * it started, as `HistoryControls` does — a disabled button still matches `:hover`.
 */
const BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-foundry-600 bg-foundry-700 text-xs font-semibold text-ink-muted transition-all duration-390 hover:bg-foundry-600 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-foundry-700 disabled:hover:text-ink-faint';
