import { resolveStyleReference } from '../../constants/categoryStyleReferences.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { styleReferenceChoices, styleReferenceFor } from '../../constants/styleReferences/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { styleReferencePatch } from '../../utils/styleReferencePatch.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { SelectField } from '../common/SelectField.tsx';

/** Why the naming switch is inert, worded to stand alone under the box it disables. */
const NOTHING_TO_NAME = 'There is no reference to name — choose one above first.';

/**
 * The published look this sheet is drawn to match, and whether the prompt says which game it is.
 *
 * The second control in the panel that writes other controls, and it writes more of them than the
 * system profile does: a reference sets the render style, surface detail, resolution, component size,
 * outline, lighting, projection, camera elevation, machine and colour in one act. So it sits beside
 * the profile above the six groups, on the same argument — a control that rewrites its neighbours
 * cannot be filed as one of them, and folded inside a group it would silently change another group's
 * header while that group was shut.
 *
 * **Choosing `NONE` writes only this field**, exactly as the profile does. Reverting the settings a
 * previous reference applied would discard whatever the reader has since done to them, and "this
 * sheet is no longer matching a published game" is not a request to undo the last ten minutes.
 *
 * The description under the control is the reference's own characteristic list, joined — the same
 * text, from the same array, that the compiled prompt carries. What the studio says the look is
 * therefore cannot drift from what the generator is told.
 *
 * **The naming switch is a separate control because it answers a separate question.** The reference
 * decides what the sheet looks like; this decides whether the prompt says the title out loud, which
 * is a fact about the target being pasted into rather than about the artwork — several refuse a
 * named commercial property outright. It is shown disabled rather than hidden while no reference is
 * set, which is how the two companion outputs report an unavailable target: a control that vanishes
 * teaches nobody why it was not applicable.
 */
export function StyleReferenceField() {
  const styleReference = useOutputStore((state) => state.output.styleReference);
  const nameStyleReference = useOutputStore((state) => state.output.nameStyleReference);
  const applyOutputPatch = useOutputStore((state) => state.applyOutputPatch);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const category = useSubjectStore((state) => state.category);

  // Narrowed through the category exactly as the Projection select is, and for the same reason one
  // step back: a reference writes the projection, so offering one the subject cannot be drawn under
  // puts a ground measurement in section 2 above a flat front elevation in section 3. Resolved
  // rather than read raw because the select cannot sit on a value its own options do not contain.
  const chosenId = resolveStyleReference(category, styleReference);
  const reference = styleReferenceFor(chosenId);

  return (
    <div className="space-y-3">
      <SelectField
        label="Art Style Reference"
        tooltip={OUTPUT_TOOLTIPS.styleReference}
        value={chosenId}
        choices={styleReferenceChoices(category)}
        description={reference === null ? '' : reference.characteristics.join(' ')}
        onChange={(value) => {
          const chosen = styleReferenceFor(value);
          applyOutputPatch(
            chosen === null
              ? { styleReference: value }
              : { styleReference: value, ...styleReferencePatch(chosen) },
          );
        }}
      />

      <CheckboxField
        label="Name the game in the prompt"
        tooltip={OUTPUT_TOOLTIPS.nameStyleReference}
        // Shown against the same conjunction the compiler gates on, so a ticked box and a prompt that
        // names nothing cannot disagree — and unticked on screen without discarding the preference,
        // so clearing the reference and choosing another leaves the box as the reader left it.
        checked={nameStyleReference && reference !== null}
        disabledReason={reference === null ? NOTHING_TO_NAME : ''}
        onChange={(checked) => {
          setOutputField('nameStyleReference', checked);
        }}
      />
    </div>
  );
}
