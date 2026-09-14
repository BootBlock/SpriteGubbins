import { useMemo } from 'react';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The subject fields a sheet's inventory is a function of, read out of the store as one record —
 * see `SheetSubject`, which is the type this builds and says why it is a record.
 *
 * **Four views needed the same reads, and adding a field to that set was four edits.** The assembly
 * base has always been one of them, and `clothing` joined it when a pool came to offer a value meaning
 * the subject has none of what the field describes. TERRAIN's *Focal Feature* is the third
 * (issue #293), and the type change alone broke `SheetFields`, `SheetProgress`, `QuantiseTab` and
 * `useSheetIdentity` in nine places — a half-applied edit the compiler happened to catch because the
 * record is a type. A fourth field now changes `DECLINABLE_FIELD_KEYS` and this hook.
 *
 * **Field by field rather than the whole subject**, which is the rule about selecting a store: a view
 * subscribing to `state.subject` re-renders on every keystroke in all sixteen fields, and these three
 * are the ones that move a component count. Memoised because every caller feeds the record to a
 * `useMemo` of its own, and a fresh object each render would defeat all of them.
 */
export function useSheetSubject(): SheetSubject {
  const anatomy = useSubjectStore((state) => state.subject.anatomy);
  const clothing = useSubjectStore((state) => state.subject.clothing);
  const focalFeature = useSubjectStore((state) => state.subject.face_head);

  return useMemo(() => ({ anatomy, clothing, face_head: focalFeature }), [anatomy, clothing, focalFeature]);
}
