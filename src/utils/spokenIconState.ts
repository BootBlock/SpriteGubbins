/**
 * A toggle state's slug as prose says it — `not-ready` is “not ready”.
 *
 * Shared by the sheet's inventory line and the catalogue row's guidance card, which both describe a
 * two-state entry's drawings and should name the states the same way.
 */
export function spokenIconState(state: string): string {
  return state.replaceAll('-', ' ');
}
