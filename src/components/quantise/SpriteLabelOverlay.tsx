import { useRef } from 'react';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { SpriteAssignment } from '../../types/spriteAssignment.ts';
import { spriteLabel } from '../../utils/spriteLabel.ts';
import { samePin } from '../../utils/spritePin.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface SpriteLabelOverlayProps {
  /** What the sheet's sprites came to, as `useSpriteAssignment` resolved it. */
  readonly assignment: SpriteAssignment;
  /** How many screen pixels one result pixel covers — `zoom * grid`, as `PaneContent` states it. */
  readonly magnification: number;
}

/**
 * The name each sprite will be written as, drawn over the marked preview and clickable.
 *
 * **The answer to “what will this piece be called” before the download rather than after it.** The
 * ring `outlineSprites` draws says where a sprite is; it cannot say what it is, and the names were
 * read for the first time at the press — so the one state a reader needed to check was the one state
 * nothing showed them.
 *
 * **DOM rather than pixels, and that is a correctness choice.** `outlineSprites` writes its marks
 * into the `ImageData` itself, which is why it can only draw rings: text in that pass would need a
 * bitmap font, would be drawn at the result's own resolution — illegible at a grid of 8 — and would
 * put the label *into* the artwork the reader is judging. Elements sit above the canvas instead, at
 * a size that does not change with the zoom, and nothing they cover is destroyed.
 *
 * **A press that followed a drag is not a click.** The pane is panned by dragging the image, and the
 * scrollport captures the pointer, so a drag beginning on one of these chips still ends as a `click`
 * on it. The travel is measured and a press that moved is ignored, which is what keeps panning past
 * a crowded sheet from selecting whatever the pointer went down on.
 */
export function SpriteLabelOverlay({ assignment, magnification }: SpriteLabelOverlayProps) {
  const selected = useSpriteAssignmentStore((state) => state.selected);
  const select = useSpriteAssignmentStore((state) => state.select);
  /** Where the pointer went down, so a press that travelled can be told from one that did not. */
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  /** Whether the press that has just finished was a drag — read by the click that may follow it. */
  const dragged = useRef(false);

  return (
    // `pointer-events-none` on the layer and back on for each chip: the layer spans the whole canvas,
    // and a transparent sheet over the artwork would take every drag the pan needs. Not `aria-hidden`
    // — the chips are the keyboard route to the same selection the list offers.
    <div className="pointer-events-none absolute inset-0">
      {assignment.sprites.map((sprite, index) => {
        // `?? null` narrows the index lookup rather than standing for a second state: a sprite's
        // piece index came from the same pass that built the list, so the two cannot disagree.
        const piece = sprite.piece === null ? null : (assignment.pieces[sprite.piece] ?? null);
        const isSelected = selected !== null && samePin(selected, sprite.pin);

        return (
          // The placement sits on a box of its own rather than on the chip, because `ControlTooltip`
          // brings its own `relative inline-flex` span between the two — an `absolute` on the chip
          // would resolve against that span and land every one of them in the same corner.
          //
          // Anchored to the sprite's own top-left, magnified by the factor the canvas is drawn at, so
          // a chip travels with its artwork through every zoom and every pan. A chip rather than a
          // box over the whole sprite: the rest of the sprite stays grabbable for the drag-pan, which
          // is the gesture the pane is otherwise driven by.
          <div
            key={`${String(sprite.pin.x)},${String(sprite.pin.y)}`}
            className="absolute"
            style={{ left: sprite.box.left * magnification, top: sprite.box.top * magnification }}
          >
            <ControlTooltip
              hint={`Sprite ${String(index + 1)}`}
              text={QUANTISE_ACTION_TOOLTIPS.selectSprite}
              // Pointer events back on here rather than on the chip: this span is what listens for
              // the hover that reveals the card, and a span left `none` by the layer above would
              // never hear it.
              className="pointer-events-auto relative inline-flex"
            >
              <button
                type="button"
                onPointerDown={(event) => {
                  // **Held back from the scrollport, or the press never becomes a click.** The pane
                  // is panned by dragging the image, and `useDragPan` answers a pointerdown by
                  // calling `preventDefault` and capturing the pointer on the scrollport — which
                  // suppresses the compatibility mouse events, `click` among them. So a mouse press
                  // on a chip did nothing at all while a scripted `element.click()` worked, which is
                  // how this was found: only driving a real pointer in a browser shows it.
                  //
                  // A drag that starts on a chip therefore pans nothing. That is the right trade:
                  // the chip is a few characters wide and the rest of every sprite is still
                  // grabbable, where a chip that could not be clicked is the whole feature lost.
                  event.stopPropagation();
                  pressedAt.current = { x: event.clientX, y: event.clientY };
                }}
                // **The travel is judged at the release, not at the click**, because a press that
                // goes down on a chip and comes up elsewhere fires no `click` at all. Judged there,
                // the recorded origin outlived the gesture, and the next *keyboard* activation —
                // which reports 0,0 — measured as a drag the width of the window and was silently
                // dropped. One press that wandered cost the reader their next Enter.
                onPointerUp={(event) => {
                  const from = pressedAt.current;
                  pressedAt.current = null;
                  dragged.current = from !== null && travelled(from, event);
                }}
                onClick={() => {
                  // A keyboard press reaches here having set nothing, and `dragged` is false from
                  // the last press that was judged — which is why these are buttons rather than
                  // pointer targets.
                  const wasDrag = dragged.current;
                  dragged.current = false;
                  if (wasDrag) return;
                  select(isSelected ? null : sprite.pin);
                }}
                className={`max-w-32 truncate rounded px-1 py-px font-mono text-2xs leading-tight transition-colors duration-390 ${chipTone(piece === null, isSelected)}`}
              >
                {`${String(index + 1)} · ${spriteLabel(sprite, piece?.name ?? null)}`}
              </button>
            </ControlTooltip>
          </div>
        );
      })}
    </div>
  );
}

/** Whether the pointer moved far enough between press and release to have been a pan and not a click. */
function travelled(from: { x: number; y: number }, event: { clientX: number; clientY: number }): boolean {
  // Three pixels, which is the slack a hand holding a mouse still leaves on a deliberate click.
  // Wider would swallow a click on a crowded sheet; narrower would select on every short drag.
  return Math.abs(event.clientX - from.x) > 3 || Math.abs(event.clientY - from.y) > 3;
}

/**
 * Which fill a chip wears: the selected one, a sprite being left out, or an ordinary piece.
 *
 * `text-foundry-950` on the two solid fills, because no ink tone reaches 4.5:1 on a solid role fill.
 * The left-out chip takes `gold` rather than `rose`: the sprite is not an error, it is a piece the
 * reader has deliberately set aside, and it can be put back with one press.
 */
function chipTone(leftOut: boolean, selected: boolean): string {
  if (selected) return 'bg-accent text-foundry-950';
  if (leftOut) return 'bg-gold text-foundry-950';
  return 'bg-foundry-950/80 text-ink';
}
