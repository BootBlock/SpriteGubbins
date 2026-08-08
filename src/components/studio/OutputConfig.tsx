import type { ReactNode } from 'react';
import { Badge } from '../common/Badge.tsx';
import { CompanionOutputFields } from './CompanionOutputFields.tsx';
import { ContinuityFields } from './ContinuityFields.tsx';
import { ProjectionFields } from './ProjectionFields.tsx';
import { RenderStyleFields } from './RenderStyleFields.tsx';
import { RiggingFields } from './RiggingFields.tsx';
import { SheetFields } from './SheetFields.tsx';

interface FieldGroupProps {
  readonly heading: string;
  readonly children: ReactNode;
}

/** One labelled run of related settings inside the panel. */
function FieldGroup({ heading, children }: FieldGroupProps) {
  return (
    <fieldset className="space-y-3.5">
      <legend className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wide text-ink-faint uppercase">
        <span aria-hidden="true" className="h-px w-3 rounded-full bg-tab/60" />
        {heading}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * How the sheet should be rendered — every technical directive, grouped the way the compiled prompt
 * groups them.
 *
 * Each group is its own component rather than another run of fields in this file: the parameter set
 * roughly tripled when render style, projection, direction sets and rigging arrived, and one panel
 * holding all of it would be exactly the god component the structural laws exist to prevent.
 *
 * Every label here names something that reaches the generator as prose, which is why the choices
 * come from `constants/output/` rather than being written out at the call site — the identifier, its
 * label and the sentence the compiler emits for it are then one edit rather than three.
 */
export function OutputConfig() {
  return (
    <section className="animate-fade-in glass-panel group/panel space-y-6 rounded-2xl border border-foundry-700 p-5 shadow-2xl transition-colors duration-300 hover:border-tab/40">
      <div className="flex items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink">
          {/* A gear that turns when the panel it heads is under the pointer. */}
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-tab/15 text-sm ring-1 ring-tab/30 transition-all duration-500 group-hover/panel:rotate-90 group-hover/panel:ring-tab/60"
          >
            ⚙️
          </span>
          <span className="font-mono text-tab">2.</span>
          Output Configuration
        </h2>
        <Badge>Technical Directives</Badge>
      </div>

      <FieldGroup heading="Sheet">
        <SheetFields />
      </FieldGroup>

      <FieldGroup heading="Render style">
        <RenderStyleFields />
      </FieldGroup>

      <FieldGroup heading="Projection & camera">
        <ProjectionFields />
      </FieldGroup>

      <FieldGroup heading="Rigging">
        <RiggingFields />
      </FieldGroup>

      <FieldGroup heading="Continuity across sheets">
        <ContinuityFields />
      </FieldGroup>

      <FieldGroup heading="Returned alongside the image">
        <CompanionOutputFields />
      </FieldGroup>
    </section>
  );
}
