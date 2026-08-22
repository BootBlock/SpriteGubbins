import type { StudioSession } from '../types/session.ts';
import { isSubjectCategory, parseOutputConfig, parseSubject } from './configParsers.ts';
import { isRecord } from './readers.ts';

/**
 * Turning a stored studio session back into a {@link StudioSession}.
 *
 * The same contract `db/configParsers.ts` and `db/settingsParser.ts` state, and for the same reason:
 * **this is not a compatibility layer and must not become one.** Nothing here translates a retired
 * identifier into its replacement. It exists because browser storage is hand-editable and can be
 * truncated, which stays possible however stable the shape is.
 *
 * `null` where the category is missing or unrecognised, and only there. The category is the one
 * field nothing can be repaired without — `parseSubject` needs it to know which option pool the
 * answers were written against, so a session without one is not a session with a gap in it, it is
 * three fields that cannot be interpreted. Everything else is repaired from defaults by the two
 * parsers below, exactly as an imported preset is.
 *
 * A `null` here means the studio keeps the defaults it booted with, which is also what a first visit
 * gets — the two are the same outcome and neither is an error.
 *
 * **The whole `OutputConfig`, not the image half.** `parsePresetRow` takes `parseImageConfig`
 * because a preset is a description of a *subject* and the companion outputs are a decision about
 * this run, which the studio's own answers should keep. A session is the opposite claim: it is the
 * studio as it was left, so the map and audit flags are part of what "as it was" means and
 * restoring without them would silently turn two settings off on every visit.
 */
export function parseSession(value: unknown): StudioSession | null {
  if (!isRecord(value)) return null;

  const category = value['category'];
  if (!isSubjectCategory(category)) return null;

  return {
    category,
    subject: parseSubject(value['subject'], category),
    output: parseOutputConfig(value['output']),
  };
}
