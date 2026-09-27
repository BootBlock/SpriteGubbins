import type { ProfiledSprite, SpriteBox } from '../types/quantiser.ts';
import { alphaProfile } from './alphaProfile.ts';

/** Each box beside its profile, in the order given — see `ProfiledSprite`. */
export function profileSprites(image: ImageData, boxes: readonly SpriteBox[]): ProfiledSprite[] {
  return boxes.map((box) => ({ box, profile: alphaProfile(image, box) }));
}
