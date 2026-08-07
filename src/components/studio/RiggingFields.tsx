import {
  JOINT_CAP_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  OVERLAP_MARGIN_CHOICES,
  RIG_MODE_CHOICES,
} from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';

/**
 * What the components are for, and — only for a cut-out rig — the geometry that makes them riggable.
 *
 * The joint, overlap and socket settings appear **only** when the rig mode calls for them. They are
 * meaningless for a pose library or a tileset, the panel is already dense, and the compiler drops
 * their prompt section on the same condition, so a visible-but-inert control would be promising
 * something the prompt does not carry.
 */
export function RiggingFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <>
      <SelectField
        label="Rig Mode"
        tooltip={OUTPUT_TOOLTIPS.rigMode}
        value={output.rigMode}
        choices={RIG_MODE_CHOICES}
        onChange={(value) => {
          setOutputField('rigMode', value);
        }}
      />

      {output.rigMode === 'CUTOUT_RIG' && (
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
