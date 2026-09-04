import { SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import type { SubjectDefinition, SubjectFieldKey } from '../../types/subject.ts';

/**
 * The visible elements an `exclusions` value bans, and the words the option pools use to ask for
 * one — the table that tells a preset banning a thing its own subject fields request.
 *
 * Section 0 ranks the two: *an exclusion in section 8 outranks every attribute that asks for the
 * same visible element*, and section 8 restates it under the list. So a configuration naming one
 * element twice — once as an attribute, once as a ban — is not ambiguous, it is **self-cancelling**:
 * the prompt asks for the thing and then removes it. `promptTemplate.ts` records why the app cannot
 * resolve that at runtime — “`worn_details` and `exclusions` are two of the same sixteen free-text
 * fields, so ruling that `No weapons` overrules a holster but not a pauldron is a judgement about
 * English, and this app makes no outbound model call to make it with”. That judgement is what this
 * table writes down, once, for the handful of elements the pools actually put on both sides.
 *
 * **It governs what the app ships, never what a reader types.** The combo boxes are unfiltered and
 * the two precedence paragraphs exist precisely so a reader's own contradiction resolves the same
 * way every time. What a reader may not meet is a *built-in* that cancels itself — a shipped preset,
 * or the default subject a category switch installs — because nobody chose that pairing.
 *
 * **A ban is written as the phrase its pool writes, and a name as a bare word.** Every option in an
 * `exclusions` pool is a prohibition, so a word appearing in one is always banned — but a
 * *qualified* ban prohibits something else, and three of them do: `No weapon fire or tracer effects`
 * bans the muzzle flash and not the gun, `No oversized pauldrons` bans a proportion and not the
 * pauldron, and `No extra eyes` bans an addition and not the eyes a creature is designed with. A
 * bare `weapon`, `pauldron` or `eye` on the ban side would read all three backwards, so the ban side
 * quotes the pool and the `names` side carries the vocabulary.
 *
 * **`promptText/exclusions.test.ts` answers the neighbouring question and cannot answer this one.**
 * That suite derives its collisions by *stem overlap* between EFFECT's own ban line and its
 * `species` pool, which is enough there because `muzzle` and `Muzzle Flash` share the word. Every
 * pairing here is a synonym — `sidearm` against `weapons`, `cloak` against `cape`, `plinth` against
 * `pedestal` — so a stem comparison returns nothing on all five, which is exactly why they had to be
 * found by reading. The two are the same shape of check over two different collision sets, and
 * neither one's mechanism finds the other's.
 *
 * **Every term is matched whole-word, with an optional plural**, which is what keeps `eye` out of
 * `Eyeless Sensing Slits` and `face` out of `Faceplate & Optic Lenses`. It is also why `holster` and
 * `holstered` are both listed: a trailing `s` is the only ending the match forgives.
 *
 * **Two guards in `exclusionElements.test.ts` keep the table from rotting**, and both are computed
 * from the pools rather than asserted. An element has to be one some **single category** both bans
 * and can name, because an element no category can contradict itself over cannot produce this defect
 * at all — that is what took `rider`, `cast shadow`, `ground plane` and `lettering` back out of a
 * first draft. And every term has to be one the app actually writes: a ban phrase has to match an
 * option in some `exclusions` pool, and a name has to match an option in some other pool. A synonym
 * nobody can trip over is a synonym this table should not be carrying.
 */
export interface ExcludedElement {
  /**
   * Phrases that, appearing in an `exclusions` value, ban this element — each quoted from the pool
   * option that writes it.
   */
  readonly bans: readonly string[];
  /** Words another subject field uses to ask for this element. */
  readonly names: readonly string[];
}

/**
 * The elements, keyed by what the exclusion calls them.
 *
 * Ten, and each one is a pairing some category can make with itself. Five of them were made:
 * `weapon` twice (the studio's own default subject, and the Cybernetic Attack Drone's cannons),
 * `cape` on the Sci-Fi Void Marine's cloak, `facial feature` on the Isometric Cut-Out Rig's single
 * eye, and `backing` on the Flat Ability Glyph Set — whose card promises “no object behind them”
 * while its `anatomy` pinned one.
 *
 * **`pedestal` is the clearest statement of why a word list is needed at all.** OBJECT bans a
 * *pedestal* and its `build` pool offers a *plinth*; nothing about those two strings overlaps, and a
 * sweep comparing words finds nothing. The same holds for `sidearm` against `weapons`, `cloak`
 * against `cape` and `cannons` against `weapons` — which is why the three reported collisions had to
 * be found by reading rather than by grep.
 */
export const EXCLUDED_ELEMENTS: Readonly<Record<string, ExcludedElement>> = {
  weapon: {
    // `No weapon fire or tracer effects` is deliberately absent: it bans the discharge, and VEHICLE
    // sheets that carry it are required by their own section 4 to draw the gun.
    bans: ['no weapons', 'weapon in frame', 'weapon entering'],
    names: [
      'weapon',
      'sidearm',
      'six-gun',
      'holster',
      'holstered',
      'scabbard',
      'ammunition',
      'cannon',
      'turret',
      'missile',
      'bayonet',
    ],
  },
  cape: {
    bans: ['no cape'],
    // A mantle is a short cloak, and `Layered Pelts & Fur Mantle` is worn over the shoulders exactly
    // as the two options spelling it `Cloak` are.
    names: ['cape', 'cloak', 'cloaked', 'mantle'],
  },
  'facial feature': {
    bans: ['no facial features'],
    // The bare word `face` is left out because the pool spends it three ways — `Face Paint`,
    // `Soot-Stained Face` and `Blank Serene Face`, the last of which is the *absence* this ban asks
    // for. Every word here names a feature rather than the surface it sits on.
    names: ['eye', 'brow', 'cheek', 'smile', 'freckle', 'beard', 'jaw', 'nose', 'lip', 'mouth'],
  },
  backing: {
    bans: ['no slot plate', 'frame, plate or panel behind'],
    names: ['backing'],
  },
  saddle: { bans: ['no saddle'], names: ['saddle'] },
  harness: { bans: ['no harness'], names: ['harness'] },
  wing: { bans: ['no wings'], names: ['wing', 'winged'] },
  'mechanical part': {
    bans: ['no mechanical parts'],
    names: ['mechanical', 'cybernetic', 'clockwork', 'automaton'],
  },
  flame: { bans: ['no flame', 'no lit flame'], names: ['flame'] },
  pedestal: { bans: ['no pedestal'], names: ['plinth'] },
};

/**
 * The fields a ban is not read against, and the reason each one is not a depicted element.
 *
 * `exclusions` is the ban itself. `role` is carved out by section 1's own closing sentence — “Do not
 * infer props, weapons or equipment from the role: if it is not listed above, it does not exist” —
 * which is what lets the Cyberpunk Katana Specialist be a katana specialist carrying no katana. The
 * two colour fields name *hues*, and the pools name hues after the things they were sampled from:
 * `Candle Flame Yellow #FBBF24` is a colour, and reading it as a flame would fail an OBJECT sheet on
 * its own palette.
 */
export const NON_DEPICTIVE_FIELDS: readonly SubjectFieldKey[] = [
  'exclusions',
  'role',
  'primary_colours',
  'accent_colours',
];

/** One field asking for an element the same subject's `exclusions` removes. */
export interface SubjectContradiction {
  readonly element: string;
  readonly field: SubjectFieldKey;
  readonly value: string;
  /** The word in `value` that named the element, so a failure says what it matched on. */
  readonly term: string;
}

/** Whether `text` uses `term` as a whole word, in the singular or the plural. */
export function mentionsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return new RegExp(String.raw`\b` + escaped + String.raw`s?\b`, 'iu').test(text);
}

/**
 * Every element this subject's `exclusions` bans while another of its fields asks for it.
 *
 * Empty is the answer for every configuration the app ships; anything else is a prompt that cancels
 * itself, and the two suites that call this treat it as a failure.
 */
export function contradictionsIn(subject: SubjectDefinition): readonly SubjectContradiction[] {
  const found: SubjectContradiction[] = [];

  for (const [element, { bans, names }] of Object.entries(EXCLUDED_ELEMENTS)) {
    if (!bans.some((ban) => mentionsTerm(subject.exclusions, ban))) continue;

    for (const field of SUBJECT_FIELD_KEYS) {
      if (NON_DEPICTIVE_FIELDS.includes(field)) continue;

      const value = subject[field];
      const term = names.find((name) => mentionsTerm(value, name));
      if (term !== undefined) found.push({ element, field, value, term });
    }
  }

  return found;
}
