import {
  LIGHTING_MODEL_CHOICES,
  OUTLINE_STYLE_CHOICES,
  outlineWithdrawal,
  OUTPUT_TOOLTIPS,
  PALETTE_LIMIT_CHOICES,
  paletteLimitWithdrawal,
  RENDER_STYLE_CHOICES,
  renderStyleWithdrawal,
  RESOLUTION_PROFILE_CHOICES,
  SURFACE_DETAIL_CHOICES,
} from '../../constants/output/index.ts';
import {
  lightingModelsFor,
  outlinesFor,
  paletteLimitsFor,
  styleSettingsFor,
  validationPassFor,
} from '../../constants/promptText/index.ts';
import { resolveMode, sheetPlanFor } from '../../constants/sheetPlans/index.ts';
import { useSheetSubject } from '../../hooks/useSheetSubject.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { statesAssembledSize } from '../../utils/componentTargetSize.ts';
import { pinnedPalette } from '../../utils/pinnedPalette.ts';
import { resolveResolutionProfile } from '../../utils/resolveResolutionProfile.ts';
import { sheetRigContract } from '../../utils/sheetRigContract.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';
import { PaletteField } from './PaletteField.tsx';

/**
 * How the sheet is drawn.
 *
 * Render style leads and resolution is separate from it, which is the point: welding the two
 * together is what made the previous template pixel-only, and a painted sheet and a pixel sheet can
 * share a resolution profile perfectly well.
 *
 * **Palette Limit appears only where no palette is pinned**, and Palette is ordered directly above
 * it so that the control deciding this is the one met first. A pinned palette supersedes the budget
 * everywhere — the compiler drops the budget line, and the quantiser maps onto the palette rather
 * than counting colours — so a visible control there would be offering a setting the prompt does not
 * carry. That is the test `RiggingFields` and `ProjectionFields` already apply to their own
 * conditional fields, and this control failed it: on a Mega Drive or a Game Boy the budget sat on
 * screen, fully operable, changing nothing.
 *
 * The question is asked as `pinnedPalette(…) === null` rather than `=== 'FREE'` because that is where
 * "no palette" is defined — one resolver reads the palette and the reader's own colours together, so
 * every reader of the rule gets it from the same answer and none of them can drift. It is also what
 * keeps the budget on screen while `CUSTOM` is chosen and nothing has been loaded into it yet.
 * `PaletteField` decides whether to explain the supersession on exactly that predicate, which is
 * what keeps the explanation and the withdrawal from ever both being absent.
 *
 * **Four controls answer to the render style in the same way**, because two of the ten styles are
 * validation passes rather than finished looks. `CLAY_RENDER` and `SILHOUETTE_ONLY` state the
 * surface themselves — one untextured material, one flat fill — so surface detail, the colour budget
 * and the outline system describe a surface the sheet is not drawing, and the compiler drops all
 * three from section 2. The lighting model goes with them on both: a flat fill has nowhere for a key
 * light to land, and a clay model is read by one fixed key light, which leaves the control one option.
 * Left on screen they would be four settings the prompt no longer carries, which is exactly the
 * failure the colour budget's own withdrawal above answers.
 *
 * Hiding it does not discard it. `paletteLimit` is untouched in the store while the palette is
 * pinned, and none of the four is touched while a pass is chosen, so the values the user chose are
 * what the sheet falls back to the moment they go back to a finished style — which is the whole
 * workflow a validation pass is for.
 *
 * **The two withdrawals of the colour budget are not the same withdrawal**, and the difference is
 * worth knowing before reading `colorPlanFor`. A pinned palette supersedes the budget *everywhere* —
 * it is the answer to "which colours may be used", so the quantiser maps onto it and stops counting.
 * A validation pass supersedes it only *in the prompt*: it says this sheet has no colour to budget,
 * which is a statement about one sheet rather than about the project's colour policy, and the
 * quantiser goes on reducing whatever image it is handed to the budget the user set. So the budget
 * is reached by leaving the pass, exactly as it is reached by clearing the palette.
 *
 * **The finished styles withdraw options as well as controls** (issue #406). A style whose own line
 * names its contour offers no `OUTLINE_LESS_ALBEDO`, `RETRO_PIXEL_ART`'s "small palette" offers no
 * budget without a count, and a style whose shading falls from a directional light offers the key
 * light alone — one option, so that control withdraws as a pass's do. Each list is the one the
 * compiler resolves against, each select shows the value the prompt states rather than the stored
 * one, and the stored value is kept for the next style that offers it, as a pass keeps its four.
 */
export function RenderStyleFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const category = useSubjectStore((state) => state.category);
  // The subject fields the sheet is a function of: a rigid object's views state a component size where
  // the standard views state an assembled one.
  const subject = useSheetSubject();

  const pass = validationPassFor(output.renderStyle);
  const settings = styleSettingsFor(output);
  const outlines = outlinesFor(output.renderStyle);
  const lightingModels = lightingModelsFor(output.renderStyle);
  const paletteLimits = paletteLimitsFor(output.renderStyle);
  const assembled = statesAssembledSize(
    category,
    subject,
    output.directionalMode,
    output.directions,
    output.sheetIndex,
  );
  // The profile the sheet is drawn at, which a rig contract takes over on the sheet it describes —
  // the answer the compiler and the header take, so the select cannot show a profile the prompt
  // does not carry. See `resolveResolutionProfile`.
  const rig = sheetRigContract(
    sheetPlanFor(
      category,
      subject,
      resolveMode(category, subject, output.directionalMode),
      output.directions,
      output.sheetIndex,
    ),
    output,
  );
  const profile = resolveResolutionProfile(output.resolutionProfile, rig);

  return (
    <>
      <SelectField
        label="Render Style"
        tooltip={OUTPUT_TOOLTIPS.renderStyle}
        value={output.renderStyle}
        choices={RENDER_STYLE_CHOICES}
        description={renderStyleWithdrawal(output.renderStyle)}
        onChange={(value) => {
          setOutputField('renderStyle', value);
        }}
      />

      {pass === null && (
        <SelectField
          label="Surface Detail Intensity"
          tooltip={OUTPUT_TOOLTIPS.surfaceDetail}
          value={output.surfaceDetail}
          choices={SURFACE_DETAIL_CHOICES}
          onChange={(value) => {
            setOutputField('surfaceDetail', value);
          }}
        />
      )}

      <SelectField
        label="Resolution Profile"
        tooltip={OUTPUT_TOOLTIPS.resolutionProfile}
        value={profile}
        choices={RESOLUTION_PROFILE_CHOICES}
        disabledReason={
          rig === null
            ? ''
            : 'The loaded rig contract states the size of every piece, so this sheet is drawn to it and the target size withdraws. Remove the contract to choose them yourself.'
        }
        onChange={(value) => {
          setOutputField('resolutionProfile', value);
        }}
      />

      {/* The label names the quantity the box actually holds, which is not the same on every sheet.
          Where a sheet's components are the parts one subject is cut into — a rig's head, torso,
          pelvis and twelve limb segments, but equally a pose library's, an articulation sheet's or
          an ITEM part library's grip and shaft — a size stated for it is the subject those assemble
          into, which is what the shipped presets already write into the value by hand — a rig's
          “48 × 96 px assembled”, a directional core's “32 × 48 px per figure”, a part library's
          “64 × 64 px per icon cell”. Asking for
          a component size and being handed an assembly is what put `- Target component size: 48 × 96
          px assembled` into section 2, a label and a value contradicting each other on one line, and
          what sent that figure on to five readers that treat it as one component's. The studio is
          where the field is filled in, so it is where the two quantities are told apart.
          `statesAssembledSize` is the same answer the compiler and the two panels take.

          Offered under `CUSTOM` alone, because the other three profiles each state a scale of their
          own and a size beside one of them was a second answer to one question (issue #405). And
          not where a rig contract applies, whose frame supersedes the field on that sheet — the
          profile's own reason says so. The value stays in the store while it is withdrawn, as every
          withdrawn control's does. */}
      {profile === 'CUSTOM' && rig === null && (
        <TextField
          label={assembled ? 'Target Assembled Size' : 'Target Component Size'}
          tooltip={OUTPUT_TOOLTIPS.spriteTargetSize}
          value={output.spriteTargetSize}
          placeholder={assembled ? '48 × 96 px assembled' : '48 × 96 px'}
          onChange={(value) => {
            setOutputField('spriteTargetSize', value);
          }}
        />
      )}

      <PaletteField />

      {pinnedPalette(output) === null && pass === null && (
        <SelectField
          label="Palette Limit"
          tooltip={OUTPUT_TOOLTIPS.paletteLimit}
          value={settings.paletteLimit}
          choices={PALETTE_LIMIT_CHOICES.filter((choice) => paletteLimits.includes(choice.value))}
          description={paletteLimitWithdrawal(output.renderStyle)}
          onChange={(value) => {
            setOutputField('paletteLimit', value);
          }}
        />
      )}

      {settings.outline !== null && (
        <SelectField
          label="Outline System"
          tooltip={OUTPUT_TOOLTIPS.outlineStyle}
          value={settings.outline}
          choices={OUTLINE_STYLE_CHOICES.filter((choice) => outlines.includes(choice.value))}
          description={outlineWithdrawal(output.renderStyle)}
          onChange={(value) => {
            setOutputField('outlineStyle', value);
          }}
        />
      )}

      {/* Withdrawn where the style offers one model or none: a select with one option is a control
          with nothing to do, and the Render Style control says which model the prompt states. */}
      {settings.lighting !== null && lightingModels.length > 1 && (
        <SelectField
          label="Lighting & Shading Model"
          tooltip={OUTPUT_TOOLTIPS.lightingModel}
          value={settings.lighting}
          choices={LIGHTING_MODEL_CHOICES.filter((choice) => lightingModels.includes(choice.value))}
          onChange={(value) => {
            setOutputField('lightingModel', value);
          }}
        />
      )}
    </>
  );
}
