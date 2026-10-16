/**
 * The roster section's sentence saying where an icon's content comes from (issue #504): the world
 * field, which picks how every catalogue icon looks, and the catalogue, where icons are chosen or
 * written. A reader wanting one particular icon looked in the studio for a place to describe it and
 * found neither.
 *
 * Built from the field's label and its group's heading, so the sentence names the field the panel
 * shows under the heading it sits in.
 */
export function iconContentSource(fieldLabel: string, groupHeading: string): string {
  return `What each icon shows comes from two places. ${fieldLabel}, under ${groupHeading}, decides how every catalogue icon looks, and the catalogue is where you choose icons or write your own.`;
}
