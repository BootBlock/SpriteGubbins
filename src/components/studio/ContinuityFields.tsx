import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { TextField } from '../common/TextField.tsx';
import { IdentityPaletteCapture } from './IdentityPaletteCapture.tsx';
import { IdentitySubjectDigest } from './IdentitySubjectDigest.tsx';

/**
 * The settings that only matter across *several* sheets.
 *
 * An eight-direction rig is eight generations of one subject, so the hardest part is not sheet one —
 * it is sheet two matching it. The identity lock is what carries a subject forward, and the two
 * controls under it are what the app can fill it in with: the subject definition it already holds,
 * and the palette read back off a sheet already accepted. They are in that order because that is the
 * order they become available — one describes a sheet that does not exist yet, the other a sheet
 * that does.
 *
 * The component map checkbox belongs with the adherence report in `CompanionOutputFields` rather
 * than here, though the argument for here — it is what makes fifteen anonymous cells importable —
 * is a real one. What those two share is a target that returns text at all, which is the thing a user
 * actually runs into when one greys out; continuity is never why either is unavailable.
 */
export function ContinuityFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

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

      <IdentitySubjectDigest />
      <IdentityPaletteCapture />
    </>
  );
}
