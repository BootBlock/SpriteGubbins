import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { supportsManifest } from '../../utils/targetCapabilities.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { TextField } from '../common/TextField.tsx';
import { IdentityPaletteCapture } from './IdentityPaletteCapture.tsx';

/**
 * The two settings that only matter across *several* sheets.
 *
 * An eight-direction rig is eight generations of one subject, so the hardest part is not sheet one —
 * it is sheet two matching it. The identity lock is what carries a subject forward, and the manifest
 * is what makes fifteen anonymous cells importable without identifying each by hand.
 */
export function ContinuityFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  const manifestAvailable = supportsManifest(output.targetModel);

  return (
    <>
      <TextField
        label="Identity Lock"
        tooltip={OUTPUT_TOOLTIPS.identityLock}
        value={output.identityLock}
        placeholder="Cyan visor across upper face; three amber chest lights in a vertical row"
        onChange={(value) => {
          setOutputField('identityLock', value);
        }}
      />

      <IdentityPaletteCapture />

      <CheckboxField
        label="Request a companion JSON manifest"
        tooltip={OUTPUT_TOOLTIPS.emitManifest}
        checked={output.emitManifest && manifestAvailable}
        disabledReason={
          manifestAvailable ? '' : 'This target returns an image only, with no channel for text.'
        }
        onChange={(checked) => {
          setOutputField('emitManifest', checked);
        }}
      />
    </>
  );
}
