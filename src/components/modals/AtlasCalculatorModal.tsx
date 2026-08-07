import { useState } from 'react';
import {
  ATLAS_CANVAS_CHOICES,
  ATLAS_PADDING_CHOICES,
  ATLAS_TOOLTIPS,
  DEFAULT_ATLAS_CANVAS_SIZE,
  DEFAULT_ATLAS_PADDING,
} from '../../constants/atlas.ts';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import {
  buildEngineMetadata,
  calculateAtlasMetrics,
  formatEngineMetadata,
  widthBiasFor,
} from '../../utils/atlasCalculator.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { AtlasGridPreview } from './AtlasGridPreview.tsx';
import { AtlasMetric } from './AtlasMetric.tsx';

/**
 * Planning the texture the finished components will be packed into.
 *
 * Answers an engine question rather than a prompt question: given the component count the sheet asks
 * for, how big can each cell be on a texture of this size, and does that texture stay GPU-friendly?
 * All of the arithmetic is in `utils/atlasCalculator.ts` — this component chooses the inputs and
 * displays the answers.
 *
 * The component count and the grid's width bias come from the studio's own configuration, so the
 * atlas being planned is always the atlas the prompt would produce — which is why the subject's
 * additional anatomy is read here too. Those pieces are components like any other, and a grid short
 * of a cell for each of them would not hold the sheet the prompt asks for.
 */
export function AtlasCalculatorModal() {
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const aspectRatio = useOutputStore((state) => state.output.aspectRatio);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const category = useSubjectStore((state) => state.category);
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const copyText = useClipboard();

  const [canvasSize, setCanvasSize] = useState(DEFAULT_ATLAS_CANVAS_SIZE);
  const [padding, setPadding] = useState(DEFAULT_ATLAS_PADDING);

  const config = {
    canvasSize,
    padding,
    componentCount: componentCountFor(category, directionalMode, parseAdditionalAnatomy(additionalAnatomy)),
    widthBias: widthBiasFor(aspectRatio),
  };
  const metrics = calculateAtlasMetrics(config);
  // Derived during render rather than memoised. Every input is a primitive that changed this render
  // anyway, so a memo keyed on the two objects above would rebuild on every pass and only add a
  // cache that never hits.
  const engineSpec = formatEngineMetadata(buildEngineMetadata(config, metrics));

  return (
    <Modal
      title="Sprite Atlas & Grid Calculator"
      icon="📊"
      onClose={toggleAtlasModal}
      panelClassName="glass-panel max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-foundry-700 shadow-2xl"
    >
      <div className="space-y-4 p-6 text-xs">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Atlas Canvas Resolution"
            tooltip={ATLAS_TOOLTIPS.canvasSize}
            value={canvasSize}
            choices={ATLAS_CANVAS_CHOICES}
            onChange={setCanvasSize}
          />
          <SelectField
            label="Cell Padding / Bleed Gutter"
            tooltip={ATLAS_TOOLTIPS.padding}
            value={padding}
            choices={ATLAS_PADDING_CHOICES}
            onChange={setPadding}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-foundry-700 bg-foundry-950 p-2.5 font-mono text-[11px]">
          <span className="text-ink-faint">GPU VRAM optimisation status</span>
          {metrics.isPowerOfTwo ? (
            <Badge tone="valid">✓ Power of 2 compliant ({canvasSize}px)</Badge>
          ) : (
            <Badge tone="attention">⚠ Non-PO2 canvas resolution</Badge>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-2.5 font-mono md:grid-cols-4">
          <AtlasMetric label="Components" value={`${config.componentCount} parts`} />
          <AtlasMetric label="Grid layout" value={`${metrics.columns}×${metrics.rows}`} />
          <AtlasMetric label="Cell size" value={`${metrics.cellSize}×${metrics.cellSize} px`} />
          <AtlasMetric label="Usable bounds" value={`${metrics.usableBounds} px max`} />
        </dl>

        <AtlasGridPreview
          columns={metrics.columns}
          rows={metrics.rows}
          componentCount={config.componentCount}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-foundry-700 px-6 py-4">
        <button
          type="button"
          onClick={() => {
            void copyText(engineSpec, 'Atlas engine spec copied');
          }}
          className="flex-1 rounded-xl border border-foundry-600 bg-foundry-950 py-2.5 text-xs font-bold text-accent-soft shadow-md transition-colors hover:bg-foundry-700"
        >
          <span aria-hidden="true">📋</span> Copy Atlas Engine Spec (JSON)
        </button>
        <button
          type="button"
          onClick={toggleAtlasModal}
          className="rounded-xl bg-accent-strong px-5 py-2.5 text-xs font-bold text-ink shadow-lg transition-colors hover:bg-accent"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
