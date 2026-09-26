import type { OutputConfig } from '../types/output.ts';
import { customPaletteRequests } from './customPaletteRequests.ts';
import { identityPaletteRequests } from './identityPaletteRequests.ts';

/**
 * Retire a file still being read into a setting that a wholesale write has just replaced.
 *
 * Restoring a history entry, loading a preset, restoring a session or undoing a change can each
 * replace the palette or the lock in one write, and each is a later choice than a palette file
 * still decoding. Without this, the file would land on top of what the reader loaded after choosing it.
 *
 * **Only a write that changes the setting retires a read.** A sheet step or a hardware profile
 * carries the palette and the lock across unchanged, and retiring the reader's file there would
 * drop a choice nothing has replaced. `setOutputField` never calls this: it is how a read lands,
 * and how the reader types into the lock while a sheet decodes, and neither is a later choice than
 * the file.
 */
export function retireOverwrittenReads(before: OutputConfig, after: OutputConfig): void {
  if (after.customPalette !== before.customPalette) customPaletteRequests.supersede();
  if (after.identityLock !== before.identityLock) identityPaletteRequests.supersede();
}
