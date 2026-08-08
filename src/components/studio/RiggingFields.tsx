import {
  JOINT_CAP_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  OVERLAP_MARGIN_CHOICES,
  rigModeChoices,
} from '../../constants/output/index.ts';
import { resolveRigMode } from '../../constants/sheetPlans/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';

/**
 * What the components are for, and — only for a cut-out rig — the geometry that makes them riggable.
 *
 * The joint, overlap and socket settings appear **only** when the rig mode calls for them. They are
 * meaningless for a pose library or a tileset, the panel is already dense, and the compiler drops
 * their prompt section on the same condition, so a visible-but-inert control would be promising
 * something the prompt does not carry.
 *
 * **The rig itself is now scoped to the category**, which is the same argument one level up and the
 * one this control was missing: a rig is a claim about how the subject is built, so a category with
 * no joints has nothing to choose between. Offering all three regardless — against a default of
 * `POSE_LIBRARY` — put section 5's pivot rules on a tileset, a nine-slice and a flipbook in the
 * state the studio *opens* in. `CATEGORY_RIG_MODES` is where that is decided; this reads it.
 *
 * Where the category leaves one answer, the sentence replaces the select rather than joining it. A
 * select offering a single option is a control with nothing to do — the same test `SheetFields`
 * applies to the sheet of a series — and the group would otherwise be empty, which reads as a panel
 * that failed to render rather than as a panel with nothing to ask.
 */
export function RiggingFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const category = useSubjectStore((state) => state.category);

  const rigChoices = rigModeChoices(category);
  // Resolved rather than read raw, for the reason `SheetFields` resolves the sheet mode: a preset or
  // history row saved before this table existed can name a rig its category has none of, and a
  // select whose value is not among its own options renders as though nothing were selected.
  const rigMode = resolveRigMode(category, output.rigMode);

  return (
    <>
      {rigChoices.length > 1 ? (
        <SelectField
          label="Rig Mode"
          tooltip={OUTPUT_TOOLTIPS.rigMode}
          value={rigMode}
          choices={rigChoices}
          onChange={(value) => {
            setOutputField('rigMode', value);
          }}
        />
      ) : (
        // Plural and article-free on purpose: three of the five categories that reach this begin
        // with a vowel, so "a {category} sheet" would render "a ITEM sheet" for most of them.
        <p className="text-xs leading-relaxed text-ink-muted">
          {category} sheets carry nothing that turns about a pivot, so there is no rig to choose. Their
          components are drawn as they assemble, and the prompt carries no articulation section.
        </p>
      )}

      {rigMode === 'CUTOUT_RIG' && (
        <>
          <SelectField
            label="Joint Cap Style"
            tooltip={OUTPUT_TOOLTIPS.jointCapStyle}
            value={output.jointCapStyle}
            choices={JOINT_CAP_STYLE_CHOICES}
            onChange={(value) => {
              setOutputField('jointCapStyle', value);
            }}
          />

          <SelectField
            label="Overlap Margin"
            tooltip={OUTPUT_TOOLTIPS.overlapMargin}
            value={output.overlapMargin}
            choices={OVERLAP_MARGIN_CHOICES}
            onChange={(value) => {
              setOutputField('overlapMargin', value);
            }}
          />

          <TextField
            label="Attachment Sockets"
            tooltip={OUTPUT_TOOLTIPS.sockets}
            value={output.sockets}
            placeholder="head, chest, back, hand_left, hand_right"
            onChange={(value) => {
              setOutputField('sockets', value);
            }}
          />
        </>
      )}
    </>
  );
}
