import { useState } from 'react';
import {
  ATLAS_CANVAS_CHOICES,
  ATLAS_PADDING_CHOICES,
  ATLAS_TOOLTIPS,
  DEFAULT_ATLAS_CANVAS_SIZE,
  DEFAULT_ATLAS_PADDING,
} from '../../constants/atlas.ts';
import { DIALOG_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useClipboard } from '../../hooks/useClipboard.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { textureCostsFor } from '../../utils/atlasBudget.ts';
import { smallestCanvasFor, spriteFitFor } from '../../utils/atlasFit.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { componentTargetSize, statesAssembledSize } from '../../utils/componentTargetSize.ts';
import {
  buildEngineMetadata,
  calculateAtlasMetrics,
  formatEngineMetadata,
  widthBiasFor,
} from '../../utils/atlasCalculator.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { AtlasFitSummary } from './AtlasFitSummary.tsx';
import { AtlasGridPreview } from './AtlasGridPreview.tsx';
import { AtlasMemoryBudget } from './AtlasMemoryBudget.tsx';
import { AtlasMeasuredSprites } from './AtlasMeasuredSprites.tsx';
import { AtlasMetricGrid } from './AtlasMetricGrid.tsx';

/**
 * Planning the texture the finished components will be packed into.
 *
 * Answers an engine question rather than a prompt question, and answers three of them: given the
 * component count the sheet asks for, how big can each cell be on a texture of this size, does the
 * component size the prompt requests actually fit that cell, and what does the texture cost in
 * graphics memory. All of the arithmetic is in `utils/atlas*.ts` — this component chooses the
 * inputs and displays the answers.
 *
 * Every input but two comes from the studio's own configuration, so the atlas being planned is
 * always the atlas the prompt would produce: the component count and the grid's width bias, and now
 * the target component size the fit is checked against. The subject's additional anatomy is read
 * here for the same reason — those pieces are components like any other, and a grid short of a cell
 * for each of them would not hold the sheet the prompt asks for.
 *
 * **One row does not come from the studio, and it is deliberately an aside rather than an input.**
 * `AtlasMeasuredSprites` reports what the sheet the reader has quantised was found to hold — a
 * measurement of one returned raster, where everything else here describes the design. It is shown
 * beside the plan and never folded into it, so the numbers this modal computes cannot change because
 * of an image dropped on another tab.
 *
 * **The contents alone — the dialog frame is `AppOverlays`'.** This file is loaded on demand,
 * so the frame has to be somewhere that is already parsed when the reader presses the control
 * that opens it; `LazyOverlay` there explains what goes wrong when it is not.
 */
export function AtlasCalculatorContents() {
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const aspectRatio = useOutputStore((state) => state.output.aspectRatio);
  const spriteTargetSize = useOutputStore((state) => state.output.spriteTargetSize);
  const directions = useOutputStore((state) => state.output.directions);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  // Read for the same reason the anatomy is: the count is a function of the subject on both fields,
  // and a category whose `clothing` pool offers a value meaning the subject has none of what it
  // describes draws fewer components when the reader chooses it.
  const clothing = useSubjectStore((state) => state.subject.clothing);
  const category = useSubjectStore((state) => state.category);
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const copyText = useClipboard();

  const [canvasSize, setCanvasSize] = useState(DEFAULT_ATLAS_CANVAS_SIZE);
  const [padding, setPadding] = useState(DEFAULT_ATLAS_PADDING);

  const config = {
    canvasSize,
    padding,
    // The sheet the studio is showing, not the series it belongs to: an atlas is laid out from one
    // returned image, and two sheets of a batch are two atlases.
    componentCount: componentCountFor(
      category,
      directionalMode,
      directions,
      sheetIndex,
      clothing,
      parseAdditionalAnatomy(additionalAnatomy),
    ),
    widthBias: widthBiasFor(aspectRatio),
  };
  const metrics = calculateAtlasMetrics(config);
  // Derived during render rather than memoised. Every input is a primitive that changed this render
  // anyway, so a memo keyed on the two objects above would rebuild on every pass and only add a
  // cache that never hits.
  //
  // Per-component, and asked for as such: a cell holds one component, so a configuration whose
  // stated size is the assembly has no size to check a cell against. That is any sheet whose
  // components are the parts one subject is cut into — a rig's head, torso, pelvis and twelve limb
  // segments, a pose library's, an ITEM part library's grip and shaft. Checked against the subject
  // they assemble into, the fit row answered for a component none of them is, and the smallest
  // canvas it names is the one that would seat fifteen whole characters. Both withdraw on `null`,
  // which the empty field has always produced. The memory figures below are a function of the canvas
  // alone and are unaffected either way.
  const target = componentTargetSize(category, directionalMode, directions, sheetIndex, spriteTargetSize);
  // The sheet's answer rather than the field's. The row below has to be true while the box is empty,
  // and on such a sheet the truthful thing to say then is not "name a size" — nothing the reader can
  // type will make a cell checkable against a component this sheet does not draw.
  const assembled = statesAssembledSize(category, directionalMode, directions, sheetIndex);
  const fit = target === null ? null : spriteFitFor(metrics.usableBounds, target);
  const smallestCanvas = target === null ? null : smallestCanvasFor(config, target);
  const costs = textureCostsFor(canvasSize);
  const engineSpec = formatEngineMetadata(buildEngineMetadata(config, metrics, fit));

  return (
    <>
      <div className="space-y-4 p-6 text-xs">
        {/*
          Stacked, not a two-column grid — which is how every other `SelectField` in the app is laid
          out, and for the reason this one has to be too. A native `<select>` renders the selected
          option into a box its container sizes, and the user agent cuts whatever overflows from the
          *right*; these labels are `2048 × 2048 px (HD atlas — recommended)`, so the part that goes
          is the recommendation — the half that tells a first-time user which option to take. Half of
          this 576px modal is a 257px control for options that need 354px, and the full width is
          526px, so the column is the whole difference between the two.
        */}
        <div className="space-y-3">
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

        <AtlasFitSummary
          usableBounds={metrics.usableBounds}
          fit={fit}
          canvasSize={canvasSize}
          smallestCanvas={smallestCanvas}
          assembled={assembled}
        />

        {/* Directly under the fit, because it answers the same question about the other half of the
            job: that row asks whether the size the prompt *requests* fits this cell, and this one
            whether the artwork that *arrived* does. It renders nothing at all while no sheet has
            been quantised, which is most of the time. */}
        <AtlasMeasuredSprites componentCount={config.componentCount} usableBounds={metrics.usableBounds} />

        <AtlasMetricGrid metrics={metrics} componentCount={config.componentCount} />

        <AtlasMemoryBudget costs={costs} />

        <AtlasGridPreview metrics={metrics} canvasSize={canvasSize} componentCount={config.componentCount} />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-foundry-700 px-6 py-4">
        {/* `flex-1` travels with the button to the wrapper, which is the flex item in this footer. */}
        <ControlTooltip
          hint="Copy Atlas Engine Spec"
          text={DIALOG_TOOLTIPS.copyAtlasSpec}
          className="relative flex flex-1"
        >
          <button
            type="button"
            onClick={() => {
              void copyText(engineSpec, 'Atlas engine spec copied');
            }}
            className="w-full rounded-xl border border-foundry-600 bg-foundry-950 py-2.5 text-xs font-bold text-accent-soft shadow-md transition-colors hover:bg-foundry-700"
          >
            <span aria-hidden="true">📋</span> Copy Atlas Engine Spec (JSON)
          </button>
        </ControlTooltip>
        <ControlTooltip hint="Done" text={DIALOG_TOOLTIPS.done}>
          <button
            type="button"
            onClick={toggleAtlasModal}
            className="rounded-xl bg-accent-strong px-5 py-2.5 text-xs font-bold text-foundry-950 shadow-lg transition-colors hover:bg-accent"
          >
            Done
          </button>
        </ControlTooltip>
      </div>
    </>
  );
}
