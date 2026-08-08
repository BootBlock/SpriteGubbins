import type { SubjectFieldKey } from '../types/subject.ts';
import type { SectionDefinition } from '../types/ui.ts';

/** One named run of subject fields, and the disclosure that folds it. */
export interface SubjectFieldGroup extends SectionDefinition {
  readonly heading: string;
  readonly keys: readonly SubjectFieldKey[];
}

/**
 * The sixteen subject fields, in five groups.
 *
 * **The headings describe the *slot*, not the character category**, and every one of them has been
 * checked against all five. That matters more than it looks: the same sixteen keys carry completely
 * different labels per category, so a heading written from `character.ts` is quietly false in the
 * other four. `clothing` alone is *Clothing / Armour*, *Harness / Augments*, *Mounting / Framework*,
 * *Scabbard / Holster* and *Awning & Addons* — which is why this group is **Features & fittings**
 * (all five are fitted or attached) and not "Surface & detail" (true only of a character's armour,
 * and colliding with `RenderStyleFields`' own *Surface Detail Intensity* one panel down).
 *
 * Two placements are worth their reasons:
 *
 * - **`additional_anatomy` sits with `anatomy`, not with `exclusions`.** It is the only one of the
 *   sixteen with consequences past the prompt text: it filters the sheet-contents choices in
 *   `SheetFields`, and it feeds the component count that the budget notice, the atlas calculator and
 *   the quantiser all read. Pairing it with exclusions grouped them on *adds versus subtracts*,
 *   which is a pun rather than a task — and it put the control that changes the component count as
 *   far as possible from the `Sheet` group whose numbers it changes.
 * - **`materials` sits with the colours.** Every category's tooltip for it describes how light reads
 *   off the surface — "metal takes a hard specular edge, cloth stays matte" — which is the same job
 *   the two colour fields do, and `PROMPT_TEMPLATE` lists the three contiguously.
 *
 * Grouping is a **display** concern only. `generatePrompt` substitutes every field by key into
 * `PROMPT_TEMPLATE`, so neither the order nor the grouping here has any bearing on the compiled
 * prompt. It does mean the panel no longer reads in the template's §1 order — a deliberate trade:
 * grouping by the task the user is doing is the whole point of the change, and the template's order
 * is an artefact of how the prompt argues its case, not of how a sheet is designed.
 *
 * `subjectGroups.test.ts` pins that every key appears exactly once across the five: a key dropped
 * here vanishes from the UI *silently*, because the compiler goes on emitting it from the store and
 * the prompt still reads correctly.
 *
 * **All five start open.** These sixteen fields are the creative work this app exists for — the
 * frequently-needed half of the progressive-disclosure split — so folding them by default would hide
 * the primary task. `OutputConfig`'s groups are the ones with defaults worth leaving alone, and
 * those fold. What this panel gets from being collapsible is the ability to *focus*, not a smaller
 * default.
 */
export const SUBJECT_FIELD_GROUPS: readonly SubjectFieldGroup[] = [
  {
    id: 'subject:identity',
    heading: 'Identity & context',
    defaultOpen: true,
    keys: ['species', 'gender', 'age', 'role', 'setting'],
  },
  {
    id: 'subject:form',
    heading: 'Form & structure',
    defaultOpen: true,
    keys: ['build', 'silhouette', 'anatomy', 'additional_anatomy'],
  },
  {
    // `face_head` leads: it is the focal feature in every category — the head, the entrance, the
    // grip, the interface screen — and every one of those tooltips says it is where the eye goes
    // first. It is not "form", which is why it is no longer filed under it.
    id: 'subject:features',
    heading: 'Features & fittings',
    defaultOpen: true,
    keys: ['face_head', 'clothing', 'worn_details'],
  },
  {
    // Not "Palette": the studio already spends that word on the colours the *sheet* may be drawn
    // from — `RenderStyleFields`' Palette and Palette Limit, and the `Palette:` line the identity lock
    // carries. These three fields describe what the subject *is* coloured, which is a different claim,
    // and the collision got sharper rather than softer when a control took the bare word.
    id: 'subject:colour',
    heading: 'Colour & materials',
    defaultOpen: true,
    keys: ['primary_colours', 'accent_colours', 'materials'],
  },
  {
    // Alone, and rightly: it is the only purely negative field, and the only one of the sixteen the
    // compiler emits outside the template's opening section.
    id: 'subject:exclusions',
    heading: 'Exclusions',
    defaultOpen: true,
    keys: ['exclusions'],
  },
];
