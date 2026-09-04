import {
  JOINT_CAP_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  OVERLAP_MARGIN_CHOICES,
  rigModeChoices,
} from '../../constants/output/index.ts';
import {
  fixedRigMode,
  offersRigMode,
  resolveMode,
  resolveRigMode,
  sheetSeriesFor,
  supportsRigMode,
} from '../../constants/sheetPlans/index.ts';
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
 *
 * **The sheet can take the choice over too, and that case keeps the select rather than replacing
 * it.** `CUTOUT_RIG_SINGLE_DIRECTION` draws the rig pieces themselves, so it has already said what
 * they are for — but unlike a category with no joints, there is a real value here, it is one of
 * three the category offers, and the three settings below appear with it. So the control stays on
 * screen showing that value, disabled and saying which setting took it over, exactly as the camera
 * elevation does under a projection that fixes it. Reverting the sheet mode hands the choice back.
 *
 * **And the sheet contents can rule one out without taking the control over**, which is the third
 * case and the reason this control reads a whole series. A pose library, an articulation sheet and a
 * part library each draw a moving part once per position it takes, so `CUTOUT_RIG` — whose first
 * rule is that no piece commits to a position — would put section 5 at odds with the inventory
 * section 4 already stated. `offersRigMode` drops it from the list, and the sentence under the
 * select says so: an option that disappears without explanation reads as a control that failed to
 * render.
 *
 * It asks about the whole pairing rather than the selected sheet, which is `resolveRigMode`'s own
 * argument and has a consequence here: the answer does not move under the Inventory Part control, so
 * the option cannot come back on one sheet of a series and go on the next. The sentence names the
 * sheet that commits, since on a directional pairing that is the last of several.
 */
export function RiggingFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const category = useSubjectStore((state) => state.category);

  // Resolved rather than read raw, for the reason `SheetFields` resolves the sheet mode: a preset or
  // history row saved before these tables existed can name a rig its category has none of, and a
  // select whose value is not among its own options renders as though nothing were selected. The
  // sheet is the second half of that resolution, and `fixedRigMode` is the half of it this control
  // has to state rather than merely obey.
  //
  // The sheet mode is resolved first and then named, rather than read raw twice: the sentence below
  // tells the user which sheet took the choice over, and it has to name the sheet `SheetFields` is
  // showing rather than the one a stale configuration asked for.
  const mode = resolveMode(category, output.directionalMode);
  // Every sheet the pairing produces, because both halves of the rig relation are properties of the
  // deliverable rather than of one of its sheets — `resolveRigMode` says why. `sheetSeriesFor`
  // resolves the pairing and the direction set on the way, so a stored mode this category cannot
  // produce shows the rig of the sheets the compiler is actually producing.
  const series = sheetSeriesFor(category, mode, output.directions);
  const rigChoices = rigModeChoices(category, series);
  const rigMode = resolveRigMode(category, series, output.rigMode);
  const fixedBySheet = fixedRigMode(series) !== undefined;
  // The other direction, and the reason it is a description rather than a `disabledReason`: the
  // sheet contents take one option away instead of taking the control over, so the select still has
  // a choice to offer and what is missing is what needs saying. Asked as "the category has this rig
  // and this pairing does not offer it" rather than as the posing value itself, so the sentence
  // cannot appear beside a list nothing was dropped from.
  const cutoutDroppedBySheet =
    supportsRigMode(category, 'CUTOUT_RIG') && !offersRigMode(category, series, 'CUTOUT_RIG');
  // The sheet the sentence names. A pairing can commit on a sheet that is not the one on screen —
  // the character's directional core leaves the choice open and the articulation sheet behind it
  // does not — so naming the *selected* sheet would point at the wrong inventory.
  const posedSheet = series.find((plan) => plan.posing === 'PER_POSITION');

  return (
    <>
      {rigChoices.length > 1 ? (
        <SelectField
          label="Rig Mode"
          tooltip={OUTPUT_TOOLTIPS.rigMode}
          value={rigMode}
          choices={rigChoices}
          // Written here beside the sentence below it rather than in `constants/`, because both are
          // accounts of what this control is doing *right now* — which option the sheet took, and
          // which it withdrew — rather than guidance about the setting. What the setting is stays
          // behind the ⓘ, where every other control's does.
          description={
            cutoutDroppedBySheet && posedSheet !== undefined
              ? `${mode} delivers a sheet that draws each moving part once per position it takes — ${posedSheet.name} — so CUTOUT_RIG is not offered here: a cut-out rig asks for every piece unposed instead, which is the opposite of what that inventory requires. Choose CUTOUT_RIG_SINGLE_DIRECTION under Sheet Contents for a sheet of rig pieces.`
              : ''
          }
          disabledReason={
            fixedBySheet
              ? `${mode} draws the rig pieces themselves, so the sheet has already said what they are for. Choose different Sheet Contents to set the rig yourself.`
              : ''
          }
          onChange={(value) => {
            setOutputField('rigMode', value);
          }}
        />
      ) : (
        // Plural and article-free on purpose: four of the nine categories that reach this begin
        // with a vowel, so "a {category} sheet" would render "a ITEM sheet" for those four.
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
