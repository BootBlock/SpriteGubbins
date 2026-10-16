import { CATEGORY_OPTIONS } from '../categories/index.ts';

/**
 * ICON's *Rarity Tier* pool, read from the field rather than written again: its first option is the
 * neutral emphasis a set mixing tiers takes, and the rest are the tiers, in rising order
 * (`iconFieldPools.test.ts` holds that order).
 */
const POOL: readonly string[] =
  CATEGORY_OPTIONS.ICON.fields.find((field) => field.key === 'gender')?.options ?? [];

/** The *Rarity Tier* a set takes when its icons differ in tier: the overlay sheets' marks tell them apart. */
export const NEUTRAL_RARITY_TIER: string = POOL[0] ?? '';

/** The tiers *Rarity Tier* offers above its neutral choice, as the field spells them. */
export const RARITY_TIERS: readonly string[] = POOL.slice(1);
