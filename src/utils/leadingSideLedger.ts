import { leadingSide } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * Which of the subject's own sides each covered yaw brings towards the camera, as a lookup.
 *
 * The rule this serves is the one the yaw list cannot carry on its own: a feature the subject has on
 * one side only is exposed while that side leads and foreshortened, occluded or gone once it does
 * not, and that change in visibility is the *only* thing distinguishing two opposite turns of an
 * asymmetric object from one drawing and its reflection. A generator that keeps such a feature at
 * full prominence in both has produced a mirror pair while satisfying every other rule in the
 * section — which is the sheet this ledger was written for.
 *
 * `FACING_TEXT` states the leading side inside each facing's own paragraph, three or four sentences
 * apart, mixed in with what the yaw hides and what it presents. Restating it as four one-line facts
 * beside the rule that consumes them is the repetition an image model's own vendor guidance asks for
 * — *repeat any requirement that must stay fixed* — and it is repetition of a **derived** fact:
 * both spellings come from {@link leadingSide}, and `chirality.test.ts` fails if the prose drifts
 * from it.
 *
 * **Not emitted under a plan view**, where the camera is on the vertical and a turn occludes
 * nothing: there is no near side to name, and what varies instead is where each side lands in the
 * frame, which `PLAN_FACING_TEXT` already states per facing. The compiler's `PLAN_VIEW` flag is what
 * decides that, as it decides the occlusion contract this ledger belongs to.
 */
export function leadingSideLedger(covered: readonly [Direction, ...Direction[]]): string {
  return covered
    .map((direction) => {
      const leading = leadingSide(direction);
      if (leading === null) {
        return `- **${direction}** — neither side leads: both flanks are edge-on and equally far from the camera.`;
      }
      const far = leading === 'left' ? 'right' : 'left';
      return `- **${direction}** — the subject’s **${leading}** side is the near one; its ${far} side is turned away.`;
    })
    .join('\n');
}
