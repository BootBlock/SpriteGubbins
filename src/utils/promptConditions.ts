import { deliberates, returnsText } from './targetCapabilities.ts';
import { isPlanView, LETTERING_IS_A_COMPONENT, perComponentLimit } from '../constants/promptText/index.ts';
import { statesAssembledSize } from './componentTargetSize.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import type { SheetFacts } from './promptFacts.ts';

/**
 * Which of the template's conditional blocks this configuration keeps.
 *
 * The compiler's second phase. `applyConditionals` reads this record and nothing else, so it is the
 * whole of what decides which headings survive — and therefore what the section numbering, the
 * citations and every wrapper that names a section are resolved against. A gate written here rather
 * than at the value it guards is what stops a heading appearing with nothing under it.
 *
 * Every value is a string because that is the template engine's vocabulary; an empty one is false.
 * The flags read from `SheetFacts` rather than from `output` for the reason that record exists: a
 * stored field can name something its category cannot honour, and a gate asking the raw value is how
 * one prompt comes to require what another part of it forbids.
 */
export function promptConditions(
  category: SubjectCategory,
  output: OutputConfig,
  facts: SheetFacts,
): Record<string, string> {
  const {
    rigMode,
    coveredDirections,
    coveredMirrorPairs,
    cameraElevation,
    batch,
    emitComponentMap,
    emitPromptFeedback,
    hardware,
    palette,
    reference,
    validationPass,
    nativeScale,
    anatomyFacings,
    additionalAnatomyLine,
    clothingIsAComponent,
  } = facts;

  const config: Record<string, string> = {
    RENDER_STYLE: output.renderStyle,
    RIG_MODE: rigMode,
    // Which quantity section 2's target-size line names. A cut-out rig sheet draws a head, a torso,
    // a pelvis and twelve limb segments, so a size stated for it is the figure those assemble into —
    // and the shipped rig presets say so in the value itself, while the line above them called it a
    // component size. One line contradicting itself, left for the generator to resolve.
    //
    // **Not `RIG_MODE`, even though section 5 is gated on that.** A FONT or ICON sheet may carry
    // `CUTOUT_RIG` as a stored value while drawing whole glyphs, and a pose-library sheet may carry
    // it as a perfectly legitimate request — its pieces do get bound to bones. The question here is
    // which sheet is drawn, and `statesAssembledSize` asks the resolved sheet plan. It asks the plan
    // alone, so it is right while the field is empty too — which is what this gate needs, since the
    // `[OPTIONAL:…]` inside it is what decides whether there is a line at all.
    ASSEMBLED_TARGET: statesAssembledSize(
      category,
      output.directionalMode,
      output.directions,
      output.sheetIndex,
    )
      ? 'yes'
      : '',
    // Gates four places at once: the precedence clause in section 0, the three surface lines and the
    // surface-discipline block in section 2 — negated — and the paragraph that replaces them. One
    // flag, because a style either states the surface itself or leaves those settings to state it.
    // The two are answers to the same question, which is why they may not both be printed: a solid
    // single-colour silhouette arrived under a sixteen-colour floor and an outline promising that
    // "forms separate by value and hue contrast alone", and no setting a user could reach agreed
    // with it.
    VALIDATION_PASS: validationPass === null ? '' : 'yes',
    // A second, narrower flag, because only one of the two passes takes the light with it. A clay
    // render is lit — the key light is what makes its volumes readable, which is the whole of what
    // it is run to check — while a flat fill of one colour has no surface for a light to fall on.
    LIGHTING_STATED: validationPass?.withholdsLight === true ? '' : 'yes',
    // Whether the target component size names a native pixel grid this sheet delivers enlarged.
    // Gates three places at once: the carve-out in section 0's resampling rule, the block in
    // section 2 that states the grid and the multiple, and the self-audit's check on what the
    // finished sheet holds. One flag, because a sheet either has a native grid to present or does
    // not — and the carve-out without the figure would be section 0 permitting an enlargement
    // nothing else in the prompt asks for. The pixel-discipline minimum is a fourth mention and is
    // deliberately not gated: it changes its unit rather than disappearing, which is why it reads
    // the same `nativeScale` instead of this flag.
    NATIVE_GRID: nativeScale === null ? '' : 'yes',
    // Read from the resolved profile rather than from the stored id, so a configuration naming a
    // machine this build no longer has emits no heading rather than an empty one — the same
    // reasoning that makes `resolveMode` the single answer about the sheet mode.
    HARDWARE_PROFILE: hardware === null ? '' : 'yes',
    // Gates three places at once: the colour clause in section 0, the palette block in section 2,
    // and the self-audit's colour check — and, negated, the palette-strategy line the pinned palette
    // supersedes. One flag, because a pinned palette either governs the sheet's colour or does not.
    PALETTE: palette === null ? '' : 'yes',
    // A second, narrower flag, because the self-audit's per-component check cites a number section 2
    // does not always print: seven of the nineteen palettes state no per-component cap, and an audit
    // asking the reader to compare against an allowance that was never given cannot be worked.
    // Read through `perComponentLimit` rather than off `colorsPerComponent`, so the gate answers
    // whether the line was *emitted* rather than whether the field was set.
    PALETTE_PER_COMPONENT: palette !== null && perComponentLimit(palette) !== null ? 'yes' : '',
    // Read from the resolved reference rather than the stored id, for the reason `HARDWARE_PROFILE`
    // is: a configuration naming a look this build no longer ships emits no heading rather than an
    // empty one.
    STYLE_REFERENCE: reference === null ? '' : 'yes',
    // Nested inside that block in the template, so this only ever decides the naming *sentence* —
    // never the characteristics, which are what actually carry the look. Conjoined here anyway, so
    // the compiler's answer does not depend on the template's nesting: this flag means "name a game"
    // and there is no game to name, which is true of the value whatever encloses it.
    STYLE_REFERENCE_NAMED: reference !== null && output.nameStyleReference ? 'yes' : '',
    // The rules about views *disagreeing* — landmarks, occlusion, no mirroring, the directional
    // audit — only bite where one sheet carries more than one facing. On a single-facing sheet they
    // would be forty lines of instruction about a comparison the generator cannot make.
    MULTI_DIRECTION: coveredDirections.length > 1 ? 'yes' : '',
    // Which of the two things a turn can be said to do. Below the vertical a yaw hides one set of
    // surfaces and reveals another, and section 3's occlusion rules and section 9's audit of them
    // both hold; at the vertical the same top surface faces the camera at every yaw, so the pair
    // become an instruction to produce a difference the stated camera cannot make and a check that
    // fails the sheet for not producing it. A generator that honours the camera fails the audit, one
    // that honours the audit abandons the camera, and which arrives is not something the user chose.
    PLAN_VIEW: isPlanView(cameraElevation) ? 'yes' : '',
    // Narrower than MULTI_DIRECTION for the same reason that flag exists at all: the anti-reflection
    // pair rules only bite where the sheet holds both members of a reflection pair, and on the
    // classic sets — which never do — they would be instruction about views the sheet does not hold.
    MIRROR_PAIRS: coveredMirrorPairs.length > 0 ? 'yes' : '',
    // Section 1's "painted onto, never a separate piece" rule names its exceptions, and this one is a
    // line that is often not there — cleared, `NONE`, or on an articulation sheet, which draws limbs
    // for a trunk the core sheets carry. Naming an absent line is worse here than anywhere else in
    // the prompt: the sentence is the one that decides how many components the sheet has. Read off
    // the *rendered* value rather than the raw field, so the gate answers whether the line was
    // emitted rather than whether the user typed something.
    ADDITIONAL_ANATOMY: additionalAnatomyLine,
    // The rule's other exception, and the one the template used to deny it had: six categories draw
    // the `clothing` value as pieces of their own, so a fixed "single exception" sentence had section
    // 1 calling a vehicle's cladding paint while section 4 listed a cladding panel. Both halves of
    // the answer are resolved in `sheetFacts` — whether the sheet draws it, and whether the line was
    // emitted at all.
    CLOTHING_IS_A_COMPONENT: clothingIsAComponent ? 'yes' : '',
    // Whether *either* paragraph below the paint rule fires, which is what decides the rule's own
    // closing clause. The sentence ends by pointing at the exceptions named under it, and that clause
    // was fixed while both paragraphs were gated — so 71 of the 118 sheets this app can compile
    // promised a named exception and named none, leaving the next line, "Do not infer props, weapons
    // or equipment from the role", as the only candidate for the exemption. A forward reference to
    // nothing is the same defect as naming an absent line, arriving from the other end.
    PAINT_EXCEPTIONS: clothingIsAComponent || additionalAnatomyLine.trim() !== '' ? 'yes' : '',
    // Which shape that exception sentence takes. On a multi-view sheet the anatomy turns with the
    // trunk — section 4 lists each piece at every one of the sheet's facings and counts it per view
    // — so the sentence must say so, or section 1 promises a single drawing the inventory below it
    // multiplies. A run sheet keeps the single-drawing sentence.
    ANATOMY_PER_VIEW: anatomyFacings !== null && anatomyFacings !== 'run' ? 'yes' : '',
    // Whether this sheet is one of several, which is a property of the configuration rather than a
    // switch the user sets: the splitter's runs differ from the studio's own configuration only in
    // fields `output` already carries, so a sheet compiled from the drawer and the same sheet
    // compiled from the studio are the same prompt and say the same thing about their batch. A
    // configuration that is one whole deliverable says nothing at all, and its prompt is unchanged.
    SERIES: batch.sheets.length > 1 ? 'yes' : '',
    IDENTITY_LOCK: output.identityLock,
    SOCKETS: output.sockets,
    EMIT_COMPONENT_MAP: emitComponentMap ? 'yes' : '',
    // Read twice by the template: once for the report section itself, and once more by the closing
    // line, which names the second deliverable so the last thing the target reads is not "generate
    // the sheet now" alone.
    EMIT_PROMPT_FEEDBACK: emitPromptFeedback ? 'yes' : '',
    // The self-audit tells the reader to check the sheet and redraw before delivering. A
    // single-pass diffusion endpoint has no such step, so on those targets it is the most
    // rule-list-shaped block in the template sitting where attention is weakest. Same reasoning as
    // MULTI_DIRECTION above, applied to what the *target* can do rather than what the sheet holds.
    DELIBERATES: deliberates(output.targetModel) ? 'yes' : '',
    // Section 0's category tripwire ends "say so rather than resolving it", which names a channel a
    // pure image endpoint does not have. It is the same argument as DELIBERATES above, applied to
    // the other capability: an instruction that cannot be carried out spends tokens in the
    // highest-weighted section of the prompt to buy nothing. What it guards against is this app's
    // own bug — the category and the inventory are compiled from one value, so they can only
    // disagree if something here is wrong — and only a target with a text channel can report that.
    RETURNS_TEXT: returnsText(output.targetModel) ? 'yes' : '',
    // The one gate in this record that is a fact about the *subject* rather than about the target or
    // the sheet, and the only one that relaxes a rule instead of adding one. Sections 0, 8 and 9 each
    // ban text on the sheet, and on a glyph set that is the ban section 4 requires the reader to
    // break — so each of the three carries a second wording that states where the exemption stops
    // rather than going quiet. `LETTERING_IS_A_COMPONENT` is where the judgement lives, including why
    // it is a record and not a test on the category here.
    LETTERING_IS_A_COMPONENT: LETTERING_IS_A_COMPONENT[category] ? 'yes' : '',
  };

  return config;
}
