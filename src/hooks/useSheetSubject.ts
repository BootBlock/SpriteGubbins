import { useMemo } from 'react';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The subject fields a sheet's inventory is a function of, read out of the store as one record —
 * see `SheetSubject`, which is the type this builds and says why it is a record.
 *
 * **Eleven call sites made the same reads, and adding a field to that set was eleven edits.** The
 * assembly base has always been one of them, and `clothing` joined it when a pool came to offer a
 * value meaning the subject has none of what the field describes. TERRAIN's *Focal Feature* is the
 * third (issue #293), and widening the type broke the eleven in twenty-five places — a half-applied
 * edit the compiler caught only because the record is a type rather than a pair of loose strings. A
 * fourth field now changes `DECLINABLE_FIELD_KEYS`, this hook and `test/sheetSubject.ts`, each of
 * which writes its keys out so that the compiler names the ones still to do.
 *
 * **ICON's roster and its *World & Era* joined them** when the icon catalogue arrived: the roster is
 * the inventory itself, and the world decides how each of its lines reads. The roster is selected by
 * reference, which only a roster edit replaces. ICON's *Extra Overlay Pieces* came next, because the
 * overlay library and those pieces are cut across as many overlay sheets as they fill.
 *
 * **Field by field rather than the whole subject**, which is the rule about selecting a store: a view
 * subscribing to `state.subject` re-renders on every keystroke in all sixteen fields, and these six
 * are the ones that move a sheet's inventory. Memoised because every caller feeds the record to a
 * `useMemo` of its own, and a fresh object each render would defeat all of them.
 */
export function useSheetSubject(): SheetSubject {
  const anatomy = useSubjectStore((state) => state.subject.anatomy);
  const setting = useSubjectStore((state) => state.subject.setting);
  const clothing = useSubjectStore((state) => state.subject.clothing);
  const focalFeature = useSubjectStore((state) => state.subject.face_head);
  const icons = useSubjectStore((state) => state.subject.icons);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);

  return useMemo(
    () => ({
      anatomy,
      setting,
      clothing,
      face_head: focalFeature,
      additional_anatomy: additionalAnatomy,
      ...(icons === undefined ? {} : { icons }),
    }),
    [anatomy, setting, clothing, focalFeature, icons, additionalAnatomy],
  );
}
