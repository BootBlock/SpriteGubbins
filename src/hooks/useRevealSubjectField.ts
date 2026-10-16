import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { SUBJECT_FIELD_GROUPS } from '../constants/subjectGroups.ts';
import { useSectionStore } from '../stores/useSectionStore.ts';
import type { SubjectFieldKey } from '../types/subject.ts';
import { subjectFieldInputId } from '../utils/subjectFieldInputId.ts';

/** The frames a field is waited for before the move gives up: a second at 60Hz, past the 585ms reveal. */
const MAX_FRAMES_TO_SHOW = 60;

/**
 * Focuses `element` on the first frame it is shown, checking once a frame.
 *
 * **Not at once, and not after a fixed count of frames.** `section-reveal` transitions the group's
 * `content-visibility` as a discrete value, so in the task that opens a `<details>` its fields are not
 * yet shown and `focus()` on one does nothing. Measured in Edge, with motion and with reduced motion
 * alike, a field is shown on the second frame after the open; asking each frame keeps that a reading
 * of the page rather than a figure to drift.
 */
function focusOnceShown(element: HTMLElement, framesLeft = MAX_FRAMES_TO_SHOW): void {
  if (element.checkVisibility()) {
    element.focus();
    return;
  }
  if (framesLeft === 0 || !element.isConnected) return;
  requestAnimationFrame(() => {
    focusOnceShown(element, framesLeft - 1);
  });
}

/**
 * A function that moves the keyboard to a subject field, opening the group it is folded under first.
 *
 * The icon roster's way to *World & Era* (issue #504), which decides what every catalogue icon shows
 * and sits in a group the reader may have folded. The open is flushed so the field is in the page
 * before it is looked for, and the focus then waits for the field to be shown (`focusOnceShown`).
 * Focusing the field opens its suggestions, as reaching it by Tab does.
 */
export function useRevealSubjectField(): (key: SubjectFieldKey) => void {
  const setSectionsOpen = useSectionStore((state) => state.setSectionsOpen);
  return useCallback(
    (key) => {
      const group = SUBJECT_FIELD_GROUPS.find((candidate) => candidate.keys.includes(key));
      if (group !== undefined) {
        flushSync(() => {
          setSectionsOpen([group.id], true);
        });
      }
      const field = document.getElementById(subjectFieldInputId(key));
      if (field !== null) focusOnceShown(field);
    },
    [setSectionsOpen],
  );
}
