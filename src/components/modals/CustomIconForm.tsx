import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CUSTOM_ICON_TOOLTIPS } from '../../constants/iconCatalogue/customIconTooltips.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { CustomIconField } from '../../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../../types/customIconFormValues.ts';
import type { CustomIconEntry, IconPick } from '../../types/iconRoster.ts';
import { checkCustomIcon } from '../../utils/checkCustomIcon.ts';
import { customIconFormDraft } from '../../utils/customIconFormDraft.ts';
import { customIconFormValues } from '../../utils/customIconFormValues.ts';
import { customIconWarnings } from '../../utils/customIconWarnings.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TextAreaField } from '../common/TextAreaField.tsx';
import { CustomIconIdentityFields } from './CustomIconIdentityFields.tsx';
import { CustomIconStateFields } from './CustomIconStateFields.tsx';

/** Picks for a subject with no roster, which the dialog is never opened over but has to type. */
const NO_PICKS: readonly IconPick[] = [];

interface CustomIconFormProps {
  /** The entry being changed, or `null` for a new one. */
  readonly entry: CustomIconEntry | null;
  /** Close the form, after a save or a cancel. */
  readonly onClose: () => void;
}

/**
 * The form for an icon of the reader's own: its role, kind, school, figure, states and look, checked as
 * typed against the roster it will join.
 *
 * **One check for the form and the store** (`checkCustomIcon`): the refusals beside each field are the
 * ones the store would return, so a form that lets the reader press Add has an entry the store accepts.
 * A field's refusal shows once it holds text or once Add has been pressed, so an empty form does not
 * open on a column of errors; a press with refusals moves focus to the first field refused.
 *
 * **Escape cancels the form, not the dialog**, as Cancel does, so a reader backing out of a draft
 * stays in the catalogue with focus on the button that opened it.
 *
 * **Warnings never block** (`customIconWarnings`): they name a word the sheet's own rules will overrule,
 * under the background key in force now, and the entry is saved as written. They sit in a polite live
 * region, so a reader typing hears one arrive.
 */
export function CustomIconForm({ entry, onClose }: CustomIconFormProps) {
  const picks = useSubjectStore((state) => state.subject.icons?.picks ?? NO_PICKS);
  const world = useSubjectStore((state) => state.subject.setting);
  const addCustomIcon = useSubjectStore((state) => state.addCustomIcon);
  const updateCustomIcon = useSubjectStore((state) => state.updateCustomIcon);
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const [values, setValues] = useState<CustomIconFormValues>(() => customIconFormValues(entry));
  const [attempts, setAttempts] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const headingId = useId();

  const draft = useMemo(() => customIconFormDraft(values), [values]);
  const check = useMemo(() => checkCustomIcon(draft, picks, entry?.id ?? null), [draft, picks, entry]);
  const warnings = useMemo(() => customIconWarnings(draft, backgroundKey), [draft, backgroundKey]);

  // The role on opening, and the first refused field after a press that was refused.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>(attempts === 0 ? 'input' : '[aria-invalid=true]')?.focus();
  }, [attempts]);

  // Escape cancels this form alone. Its default action is the dialog's `cancel`, which would close the
  // whole catalogue and throw the draft away, so it is prevented here and the form closes instead. A
  // listener on the element rather than a JSX handler, since a form is not an interactive element.
  useEffect(() => {
    const form = formRef.current;
    if (form === null) return undefined;
    const cancel = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    form.addEventListener('keydown', cancel);
    return () => {
      form.removeEventListener('keydown', cancel);
    };
  }, [onClose]);

  // What each field holds, so a refusal waits until there is something to refuse or Add was pressed.
  // The school always holds a value, and the set's room is measured whatever the fields hold.
  const typed: Readonly<Record<CustomIconField, string>> = {
    role: values.role,
    school: values.school,
    firstState: values.firstState,
    secondState: values.secondState,
    look: values.look,
    set: 'measured',
  };
  const problem = (field: CustomIconField): string =>
    attempts === 0 && typed[field].trim() === ''
      ? ''
      : (check.refusals.find((refusal) => refusal.field === field)?.message ?? '');
  const update = (change: Partial<CustomIconFormValues>): void => {
    setValues((current) => ({ ...current, ...change }));
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (check.entry === null) {
      setAttempts((count) => count + 1);
      return;
    }
    const refused = entry === null ? addCustomIcon(draft) : updateCustomIcon(entry.id, draft);
    if (refused.length === 0) onClose();
  };
  const submitLabel = entry === null ? 'Add to your set' : 'Save changes';

  return (
    <form
      ref={formRef}
      aria-labelledby={headingId}
      noValidate
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-tab/40 bg-foundry-950 p-4"
    >
      <h3 id={headingId} className="text-xs font-bold tracking-wide text-ink uppercase">
        {entry === null ? 'Add your own icon' : `Change “${entry.role}”`}
      </h3>

      <CustomIconIdentityFields values={values} world={world} problem={problem} onChange={update} />
      <CustomIconStateFields values={values} problem={problem} onChange={update} />
      <TextAreaField
        label="Look"
        tooltip={CUSTOM_ICON_TOOLTIPS.look}
        value={values.look}
        placeholder="a scorched brass keycard on a snapped chain"
        rows={3}
        problem={problem('look')}
        onChange={(look) => {
          update({ look });
        }}
      />

      <div aria-live="polite" className="space-y-1">
        {warnings.map((warning) => (
          <p key={warning} className="text-xs leading-relaxed text-gold">
            {warning}
          </p>
        ))}
        {problem('set') !== '' && <p className="text-xs leading-relaxed text-rose">{problem('set')}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <ControlTooltip hint="Cancel" text={ICON_CATALOGUE_ACTION_TOOLTIPS.cancelOwn}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
        </ControlTooltip>
        <ControlTooltip
          hint={submitLabel}
          text={
            entry === null
              ? ICON_CATALOGUE_ACTION_TOOLTIPS.submitNew
              : ICON_CATALOGUE_ACTION_TOOLTIPS.submitChange
          }
        >
          <Button variant="primary" size="md" type="submit">
            {submitLabel}
          </Button>
        </ControlTooltip>
      </div>
    </form>
  );
}
