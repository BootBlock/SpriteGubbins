import { CUSTOM_ICON_FAMILY_SIZE } from '../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import type { CustomIconRefusal, CustomIconVariantDraft } from '../types/customIconDraft.ts';
import type { CustomIconVariant } from '../types/iconRoster.ts';
import { collapsed, namedRefusals, textRefusals, unclosed } from './customIconTextRefusals.ts';
import { slugify } from './slugify.ts';

/**
 * A family's members as an entry stores them, with a refusal pushed for each that cannot be one.
 *
 * **A name is held to a state's rules and becomes a slug**, since it ends the member's slot name; two
 * names with one slug would cut two sprites to one file. **A phrase is held to a look's rules, and
 * refuses a semicolon and a long dash as well**, because the inventory line lists the members divided by
 * semicolons ahead of the dash that opens the shared look: either in a phrase would move a member's
 * words into the next member or into the look. A phrase left empty is no phrase, so the member is told
 * apart by its name alone. The family's size is `CUSTOM_ICON_FAMILY_SIZE`'s.
 */
export function checkIconVariants(
  typed: readonly CustomIconVariantDraft[],
  refusals: CustomIconRefusal[],
): readonly CustomIconVariant[] {
  if (typed.length < CUSTOM_ICON_FAMILY_SIZE.fewest || typed.length > CUSTOM_ICON_FAMILY_SIZE.most) {
    refusals.push({ field: 'variants', message: CUSTOM_ICON_REFUSALS.familySize(typed.length) });
  }
  const seen = new Set<string>();
  return typed.map((variant, index) => {
    const nameField = `variantName${index}` as const;
    const lookField = `variantLook${index}` as const;
    const spoken = collapsed(variant.name);
    const name = slugify(spoken);
    const look = unclosed(collapsed(variant.look));
    refusals.push(
      ...namedRefusals(nameField, spoken, name, 'variantName'),
      ...textRefusals(lookField, look, 'variantLook'),
    );
    if (look.includes(';')) {
      refusals.push({ field: lookField, message: CUSTOM_ICON_REFUSALS.variantSemicolon });
    }
    if (name === '') {
      refusals.push({ field: nameField, message: CUSTOM_ICON_REFUSALS.variantEmpty(index + 1) });
    } else if (seen.has(name)) {
      refusals.push({ field: nameField, message: CUSTOM_ICON_REFUSALS.sameVariants });
    }
    seen.add(name);
    return look === '' ? { name } : { name, look };
  });
}
