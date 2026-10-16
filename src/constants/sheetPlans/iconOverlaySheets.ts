import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { ComponentEntry, ComponentGroup, SheetPlan } from '../../types/components.ts';
import type { IconLook } from '../../types/iconRoster.ts';
import type { OverlayLine } from '../../types/overlayLine.ts';
import { formatAnatomyComponent } from '../../utils/additionalAnatomy.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { entrySlots } from '../../utils/entrySlots.ts';
import { slugify } from '../../utils/slugify.ts';
import { fieldLabelFor } from '../categories/index.ts';
import { ICON_GRID_COLUMNS, ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';
import { overlayRuns } from '../../utils/overlayRuns.ts';
import { namesAFrame } from '../promptText/namesAFrame.ts';
import { ICON_CELL_SENTENCE } from './iconCellSentence.ts';
import { iconGridSentence } from './iconGridSentence.ts';
import { ICON_OVERLAY_LIBRARY } from './iconOverlayLibrary.ts';

/**
 * The overlay sheets that close every ICON series: the look's overlay library and the reader's *Extra
 * Overlay Pieces*, cut into sheets of at most sixteen components, one piece to a cell of the icon
 * sheets' grid.
 *
 * **As many sheets as the pieces fill, and no cap.** The library is fourteen components, and a reader's
 * own pieces past the sixteen cells of one sheet used to be appended to it regardless, so a sheet asked
 * for more drawings than it has cells. The library and the extras are now one run of lines, in that
 * order, cut by `overlayRuns` into the fewest sheets they fill and as evenly as the lines allow, so
 * eighteen pieces are two sheets of nine. A reader's piece is laid across sheets only where keeping it
 * whole would cost a sheet, or where it is worth more than one, so no sheet holds more than its cells.
 *
 * **One piece to a cell, at its place on the icon** (`SheetPlan.placement`). Every sheet opens with the
 * grid sentence and the cell sentence the icon sheets state, then the look's placement sentence, so the
 * Quantise tab can find each piece's cell from the gaps between the pieces (`cellLattice`) and keep it
 * where it was drawn over its icon. Each sheet declares the icon sheets' `cellGrid`, so it takes their
 * grid and scale.
 *
 * **The extras are listed, not appended.** They are pieces of the library, drawn in the *Overlay Style*
 * and laid out by the same cell sentence, so they are a group of each sheet that draws them, marked
 * `additional`; every sheet declares `anatomy: 'ELSEWHERE'`, so `componentBreakdownFor` appends nothing.
 *
 * **Flat, under no camera, and dressed in none of the icons' attributes.** The pieces used to take the
 * icons' projection, so a square ring and a cooldown wedge came back as isometric diamonds; the plan
 * declares `PICTURE_PLANE`, and section 3 tells them they lie flat and square to the screen. And
 * section 1 lists the icons' materials, colours and condition, which a wedge told it was painted with
 * them came back wearing; the plan declares `LAID_OVER`, so section 1 says those describe the icons
 * beneath, and a piece takes its colour and value from its own entry — the veil and the sweep are dark
 * under both looks — and the accent colour otherwise.
 *
 * **Opaque at full strength, and the engine supplies the translucency.** A veil, a wedge, a halo and a
 * glow are see-through in use, and drawn see-through on an opaque key they cannot keep clear of it. The
 * plan declares `opacity`, so section 0 asks for each as a solid shape or as stepped bands with hard
 * edges, and the self-audit checks it — see `SheetPlan.opacity`. Neither look declares `backdrop`: a
 * piece the engine lays over an icon has to stay open around its own shape, or it hides the icon.
 *
 * **Nothing here carries lettering**, for the reason `CATEGORY_EXCLUSION_TEXT` gives: a stack count, a
 * cooldown and a keybind are drawn by the engine at runtime over the top of the sprite.
 */
export function iconOverlaySheets(
  look: IconLook,
  extras: readonly AnatomyComponent[],
): readonly [SheetPlan, ...SheetPlan[]] {
  const { groups } = ICON_OVERLAY_LIBRARY[look];
  const taken = new Set(groups.flatMap((group) => group.entries.flatMap(namesOf)));
  const written = extras.map((piece) => ({ piece, entry: extraEntry(piece, taken) }));
  const yours: ComponentGroup = {
    heading: fieldLabelFor('ICON', 'additional_anatomy'),
    intro:
      'Further pieces of the same library, each drawn as its own component in the style every piece shares:',
    entries: written.map(({ entry }) => entry),
    additional: true,
  };
  const lines: OverlayLine[] = [
    ...groups.flatMap((group) => group.entries.map((entry) => ({ group, entry, count: entry.count }))),
    ...written.map(({ piece, entry }) => ({ group: yours, entry, count: entry.count, piece })),
  ];
  const runs = overlayRuns(lines, ICONS_PER_SHEET);
  let first = 1;
  const sheets = runs.map((run) => {
    const sheet = overlaySheet(look, run, first, runs.length === 1);
    first += componentTotal(run.map((line) => line.entry));
    return sheet;
  });
  const [head, ...rest] = sheets;
  // Unreachable: the library alone is a run, so the cut always holds one.
  if (head === undefined) throw new Error('The overlay library cut into no sheets.');
  return [head, ...rest];
}

/**
 * One of the reader's own pieces, as a line of the library drawn in the *Overlay Style*, under a label no
 * line before it answers to.
 *
 * **Unique across the whole library, not only its own sheet.** `componentSlots` numbers a repeat within
 * one sheet, and the cut can put a reader's `Selected Ring` on the second overlay sheet and the
 * library's on the first, where two files of one name would land in one folder. So the label takes the
 * first numbered suffix that neither it nor any of its drawings shares with a line already listed —
 * `tier-mark-2` is a drawing of the library's tier marks, so a reader's `Tier Mark` becomes `tier-mark-5`.
 * A name that slugs to nothing — one typed in a script with no Latin letters — is labelled
 * `extra-overlay-piece`, numbered the same way, since a name left empty would be named by its place on
 * its own sheet and repeat across sheets.
 */
function extraEntry(piece: AnatomyComponent, taken: Set<string>): ComponentEntry {
  const base = slugify(piece.name) || 'extra-overlay-piece';
  const whole = (label: string): ComponentEntry => ({
    label,
    text: formatAnatomyComponent(piece),
    count: piece.count,
    kind: 'structure',
    attribute: { field: 'clothing', role: 'DRAWN_IN_IT' },
  });
  let entry = whole(base);
  for (let suffix = 2; namesOf(entry).some((name) => taken.has(name)); suffix += 1) {
    entry = whole(`${base}-${String(suffix)}`);
  }
  for (const name of namesOf(entry)) taken.add(name);
  return entry;
}

/** What a line of an overlay sheet answers to: its label, and the name of each of its drawings. */
function namesOf(entry: ComponentEntry): readonly string[] {
  return [entry.label, ...entrySlots(entry, 'run')];
}

/** One overlay sheet, holding one run of the cut — named for its place in the library where there are several. */
function overlaySheet(look: IconLook, run: readonly OverlayLine[], first: number, alone: boolean): SheetPlan {
  const { wording, framing } = ICON_OVERLAY_LIBRARY[look];
  const entries = run.map((line) => line.entry);
  const count = componentTotal(entries);
  const listed = regroup(run);
  const groups = listed.map((group, at) => ({
    ...group,
    ...(at === listed.length - 1
      ? {
          outro: `No piece carries a letter, a numeral, a stack count or a key name: those are drawn by the engine at
runtime over the top of the sprite.`,
        }
      : {}),
  }));
  return {
    name: alone ? 'Overlay pieces' : `Overlay pieces ${String(first)}–${String(first + count - 1)}`,
    facings: 'run',
    assembly: wording.assembly,
    targetQuantity: 'COMPONENT',
    extent: 'WHOLE',
    identity: 'ONE_SET',
    // The engine lays each piece over a finished icon in screen space, so a piece is a flat shape square
    // to the screen and takes none of the icons' projection: a square ring stays square under any camera.
    orientation: 'PICTURE_PLANE',
    // Section 1 describes the icons these pieces are laid over, never the pieces.
    subjectScope: 'LAID_OVER',
    // The cooldown sweep is drawn at two stages, and a tier mark at four.
    posing: entries.some((entry) => entry.count > 1) ? 'PER_POSITION' : 'UNSTATED',
    // The agreement shape: these pieces are not parts of one another, so what has to hold is that no
    // piece arrives at half the weight of the one beside it.
    scaleExample: wording.scaleExample,
    // Each piece is drawn to the square of the icon it is laid over, so all of them to one square.
    fit: 'SAME_SQUARE',
    cellGrid: ICON_GRID_COLUMNS,
    placement: look === 'FULL_BLEED_TILE' ? 'WITHIN_TILE' : 'WITHIN_CELL',
    // The veil, the wedge, the halo and the glow are translucent in use; the engine applies that, and
    // every piece is drawn opaque at full strength (audit finding P8).
    opacity: 'ENGINE_APPLIED',
    // The selected ring and the highlight halo are edges round a square, so no wrapper negates a frame or
    // a border on a sheet that draws one (audit finding T2).
    ...(entries.some((entry) => framing.has(entry.label) || namesAFrame(entry.text))
      ? { frames: 'DRAWN' }
      : {}),
    // The reader's pieces are listed above, in the group marked `additional`.
    anatomy: 'ELSEWHERE',
    // A sheet of one piece states the first cell, where the Quantise tab reads it, rather than the
    // middle of the sheet an icon sheet of one is drawn in.
    opening: `${count === 1 ? 'One drawing, in the first cell, at the top left of the sheet.' : iconGridSentence(count)}\n${ICON_CELL_SENTENCE}\n${wording.placement}`,
    scaleUnit: 'one icon',
    componentClass: 'one overlay piece the engine lays over an icon of this one set',
    assemblyFailure: {
      instruction:
        'Do not draw any piece already laid over an icon, or the pieces placed on a hotbar or a finished screen, anywhere on the sheet, including as a reference or key.',
      exclusion:
        'Any overlay piece shown laid over an icon or placed on a hotbar or other finished screen, and any picture of the pieces in use.',
      audit:
        'no piece arrives already laid over an icon, and nothing on the sheet is a hotbar or a finished screen',
    },
    groups,
  };
}

/** A run's lines gathered back under the groups they came from, in order, each group once. */
function regroup(run: readonly OverlayLine[]): readonly ComponentGroup[] {
  const listed: ComponentGroup[] = [];
  for (const { group, entry } of run) {
    const last = listed.at(-1);
    if (last !== undefined && last.heading === group.heading) {
      listed[listed.length - 1] = { ...last, entries: [...last.entries, entry] };
    } else {
      listed.push({ ...group, entries: [entry] });
    }
  }
  return listed;
}
