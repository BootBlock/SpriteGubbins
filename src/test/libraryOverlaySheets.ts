import { iconOverlaySheets } from '../constants/sheetPlans/iconOverlaySheets.ts';
import type { SheetPlan } from '../types/components.ts';
import type { IconLook } from '../types/iconRoster.ts';

/**
 * Each look's overlay sheet as a set with no *Extra Overlay Pieces* draws it: the whole library, on one
 * sheet. The checks that hold the library's wording and declarations read it here, where they read the
 * one overlay plan each look had before the reader's pieces could add a sheet.
 */
export const LIBRARY_OVERLAY_SHEETS: Readonly<Record<IconLook, SheetPlan>> = {
  FULL_BLEED_TILE: iconOverlaySheets('FULL_BLEED_TILE', [])[0],
  ISOLATED_MARK: iconOverlaySheets('ISOLATED_MARK', [])[0],
};
