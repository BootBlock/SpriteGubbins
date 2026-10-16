import { useEffect, useRef } from 'react';
import { CUSTOM_ICON_FAMILY_SIZE } from '../../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_TOOLTIPS } from '../../constants/iconCatalogue/customIconTooltips.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { CustomIconField, CustomIconVariantDraft } from '../../types/customIconDraft.ts';
import { Button } from '../common/Button.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TextField } from '../common/TextField.tsx';

/** A placeholder for each of the first members, so they read as the dose ladder the tooltip names. */
const NAME_PLACEHOLDERS: readonly string[] = ['small', 'standard', 'large'];

interface CustomIconVariantFieldsProps {
  readonly variants: readonly CustomIconVariantDraft[];
  /** Why a field cannot be accepted as it stands, or empty — `CustomIconForm` decides when it shows. */
  readonly problem: (field: CustomIconField) => string;
  readonly onChange: (variants: readonly CustomIconVariantDraft[]) => void;
}

/**
 * The members of a family of the reader's own, in the order the sheet draws them: each a name and an
 * optional phrase with a button that removes it, and a button below that adds another, between
 * `CUSTOM_ICON_FAMILY_SIZE`'s bounds.
 *
 * **The keyboard follows the list**: an added member's name takes focus, and a removal passes focus to
 * the name of the member now in that place, or of the last member where the last was removed, so a
 * reader never stays on a button that has gone. A refusal about the family as a whole sits under it.
 */
export function CustomIconVariantFields({ variants, problem, onChange }: CustomIconVariantFieldsProps) {
  const listRef = useRef<HTMLOListElement>(null);
  // The member whose name takes focus once the list has rendered an addition or a removal: a ref
  // rather than state, since nothing renders from it.
  const focusMember = useRef<number | null>(null);

  useEffect(() => {
    if (focusMember.current === null) return;
    listRef.current?.children[focusMember.current]?.querySelector('input')?.focus();
    focusMember.current = null;
  }, [variants.length]);

  const change = (index: number, member: Partial<CustomIconVariantDraft>): void => {
    onChange(variants.map((each, at) => (at === index ? { ...each, ...member } : each)));
  };
  const remove = (index: number): void => {
    onChange(variants.filter((_, at) => at !== index));
    focusMember.current = Math.min(index, variants.length - 2);
  };
  const add = (): void => {
    onChange([...variants, { name: '', look: '' }]);
    focusMember.current = variants.length;
  };
  const atFewest = variants.length <= CUSTOM_ICON_FAMILY_SIZE.fewest;
  const atMost = variants.length >= CUSTOM_ICON_FAMILY_SIZE.most;

  return (
    <div className="space-y-2">
      <ol ref={listRef} className="space-y-2">
        {variants.map((variant, index) => {
          const position = String(index + 1);
          return (
            // The position is the member's identity: the sheet draws the members in this order, and a
            // removal moves each later member up into the place and the label of the one before it.
            <li key={position} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <TextField
                label={`Variant ${position}`}
                tooltip={CUSTOM_ICON_TOOLTIPS.variantName}
                value={variant.name}
                placeholder={NAME_PLACEHOLDERS[index] ?? `variant ${position}`}
                problem={problem(`variantName${index}`)}
                onChange={(name) => {
                  change(index, { name });
                }}
              />
              <TextField
                label={`Variant ${position}’s look`}
                tooltip={CUSTOM_ICON_TOOLTIPS.variantLook}
                value={variant.look}
                placeholder="how it differs, where its name does not say"
                problem={problem(`variantLook${index}`)}
                onChange={(look) => {
                  change(index, { look });
                }}
              />
              <ControlTooltip
                hint={`Remove variant ${position}`}
                text={
                  atFewest
                    ? ICON_CATALOGUE_ACTION_TOOLTIPS.removeVariantAtFewest
                    : ICON_CATALOGUE_ACTION_TOOLTIPS.removeVariant
                }
                className="relative inline-flex sm:mt-5"
              >
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Remove variant ${position}`}
                  disabled={atFewest}
                  onClick={() => {
                    remove(index);
                  }}
                >
                  Remove
                </Button>
              </ControlTooltip>
            </li>
          );
        })}
      </ol>
      {problem('variants') !== '' && (
        <p className="text-xs leading-relaxed text-rose">{problem('variants')}</p>
      )}
      <ControlTooltip
        hint="Add a variant"
        text={
          atMost ? ICON_CATALOGUE_ACTION_TOOLTIPS.addVariantAtMost : ICON_CATALOGUE_ACTION_TOOLTIPS.addVariant
        }
      >
        <Button variant="secondary" size="sm" disabled={atMost} onClick={add}>
          Add a variant
        </Button>
      </ControlTooltip>
    </div>
  );
}
