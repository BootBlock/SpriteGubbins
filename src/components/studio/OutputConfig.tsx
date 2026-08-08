import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import {
  companionDigest,
  continuityDigest,
  projectionDigest,
  renderStyleDigest,
  riggingDigest,
  sheetDigest,
} from '../../utils/studioDigests.ts';
import { CollapsibleSection } from '../common/CollapsibleSection.tsx';
import { SectionToggleAll } from '../common/SectionToggleAll.tsx';
import { CompanionOutputFields } from './CompanionOutputFields.tsx';
import { ContinuityFields } from './ContinuityFields.tsx';
import { ProjectionFields } from './ProjectionFields.tsx';
import { RenderStyleFields } from './RenderStyleFields.tsx';
import { RiggingFields } from './RiggingFields.tsx';
import { SheetFields } from './SheetFields.tsx';
import { SystemProfileField } from './SystemProfileField.tsx';

/**
 * Which of the six groups is unfolded to begin with.
 *
 * The split is Nielsen Norman's progressive-disclosure rule — frequently-needed up front,
 * specialised on request — applied to **what the defaults leave you needing to change**, which is
 * the only honest reading of "frequently needed" here. There is no project and no carried-over
 * configuration: `useOutputStore` initialises from `DEFAULT_OUTPUT_CONFIG` with no persistence, and
 * a preset or a history entry is restored only when the user explicitly opens one. So every setting
 * in this panel is decided on *this* visit, and a split justified by "set once per project" would be
 * describing a persistence model the app does not have.
 *
 * - **Sheet** — the contents, count, key colour and canvas. Nobody's sheet is the default sheet.
 * - **Render style** — open, and the correction that matters most here. It is the only control in
 *   either panel that adds and removes whole *sections* of the template — the pixel-discipline
 *   block, its painted alternative, and an audit clause — so it changes more of the compiled prompt
 *   than anything but the sheet contents. Folding the biggest block on the page was tempting for
 *   exactly the wrong reason.
 * - **Projection & camera**, **Rigging** — folded. Their defaults are the common case, choosing a
 *   projection moves the elevation with it, and three of Rigging's four controls do not exist
 *   outside a cut-out rig.
 * - **Continuity across sheets** — folded. The identity lock is written *after* sheet one is
 *   accepted, so on arrival the group is inert and its digest says so; it is also by some way the
 *   tallest of the six, carrying both of the lock's derivation controls and their explanations.
 * - **Returned alongside the image** — folded. Both its checkboxes are off by default, and each
 *   adds a second deliverable to the prompt rather than changing the sheet.
 *
 * Nothing is *hidden* by folding: each header carries its group's current values while it is shut,
 * which is what makes the folded panel more readable than the open one rather than less.
 */
const SECTIONS = {
  sheet: { id: 'output:sheet', defaultOpen: true },
  renderStyle: { id: 'output:render-style', defaultOpen: true },
  projection: { id: 'output:projection', defaultOpen: false },
  rigging: { id: 'output:rigging', defaultOpen: false },
  continuity: { id: 'output:continuity', defaultOpen: false },
  companion: { id: 'output:companion', defaultOpen: false },
} as const;

const ALL_SECTIONS = Object.values(SECTIONS);

/**
 * How the sheet should be rendered — every technical directive, grouped the way the compiled prompt
 * groups them, and foldable.
 *
 * Each group is its own component rather than another run of fields in this file: the parameter set
 * roughly tripled when render style, projection, direction sets and rigging arrived, and one panel
 * holding all of it would be exactly the god component the structural laws exist to prevent.
 *
 * Every label here names something that reaches the generator as prose, which is why the choices
 * come from `constants/output/` rather than being written out at the call site — the identifier, its
 * label and the sentence the compiler emits for it are then one edit rather than three.
 *
 * **Single column throughout**, unlike `SubjectForm`'s two-up grid. These values are long
 * identifiers — `CORE_DIRECTIONAL_VARIANTS (49 across 2 sheets)` — and halving the width would truncate
 * them in the control itself. This panel gets its height back from folding instead.
 *
 * The digests are read here rather than inside each group's component, so the store subscription
 * that recomputes them lives in one place and a folded group's header still updates when something
 * else changes its value.
 */
export function OutputConfig() {
  const output = useOutputStore((state) => state.output);
  const category = useSubjectStore((state) => state.category);

  return (
    <section className="animate-view-fade-in glass-panel group/panel rounded-2xl border border-foundry-700 p-5 shadow-2xl transition-colors duration-585 hover:border-tab/40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-ink">
          {/* A gear that turns when the panel it heads is under the pointer. */}
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-tab/15 text-sm ring-1 ring-tab/30 transition-all duration-975 group-hover/panel:rotate-90 group-hover/panel:ring-tab/60"
          >
            ⚙️
          </span>
          <span className="font-mono text-tab">2.</span>
          Output Configuration
        </h2>

        <SectionToggleAll sections={ALL_SECTIONS} panelLabel="Output Configuration" />
      </div>

      {/*
        Above the groups, because it writes into two of them: choosing a machine sets the render
        style, surface detail, resolution, component size, outline, lighting and palette at once.
        Folded away inside one group it would be a control that silently changed another group's
        header while that group was shut.
      */}
      <div className="mb-4 border-b border-foundry-700 pb-4">
        <SystemProfileField />
      </div>

      {/*
        The groups get their own container so `CollapsibleSection`'s `first:border-t-0` has something
        to be first *of*. Left as direct children of the panel, the header above is `:first-child`
        and no group ever matches — which drew a second horizontal rule 8px under the header's.
      */}
      <div>
        <CollapsibleSection {...SECTIONS.sheet} heading="Sheet" digest={sheetDigest(category, output)}>
          <SheetFields />
        </CollapsibleSection>

        <CollapsibleSection
          {...SECTIONS.renderStyle}
          heading="Render style"
          digest={renderStyleDigest(output)}
        >
          <RenderStyleFields />
        </CollapsibleSection>

        <CollapsibleSection
          {...SECTIONS.projection}
          heading="Projection & camera"
          digest={projectionDigest(output)}
        >
          <ProjectionFields />
        </CollapsibleSection>

        <CollapsibleSection {...SECTIONS.rigging} heading="Rigging" digest={riggingDigest(output)}>
          <RiggingFields />
        </CollapsibleSection>

        <CollapsibleSection
          {...SECTIONS.continuity}
          heading="Continuity across sheets"
          digest={continuityDigest(output)}
        >
          <ContinuityFields />
        </CollapsibleSection>

        <CollapsibleSection
          {...SECTIONS.companion}
          heading="Returned alongside the image"
          digest={companionDigest(output)}
        >
          <CompanionOutputFields />
        </CollapsibleSection>
      </div>
    </section>
  );
}
