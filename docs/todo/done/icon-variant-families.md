# Icon variant families — design record

> **Status:** ✅ COMPLETE — an icon of the reader's own can be a family of two to eight variants of one design, written once and edited as one entry. Kept for the decisions below and why each was taken.

## 1. Why

An Icon set could not turn one description into a family of icons. A reader who wanted a set of
cyberpunk health potions — a small, a standard and a large dose, or one potion at each rarity — had
two routes, and neither made the family from a description of their own:

- **The catalogue's tiered roles** (*Minor healing consumable*, *Healing consumable*, *Major healing
  consumable*) serve only the concepts the catalogue holds, in its own words.
- **Add your own icon, once per variant.** Each entry needs a role of its own, because the role's
  slug is the slot and the file name, so five variants were five forms, each with the shared
  description typed again. *Two states* drew one icon twice, as a toggle, which is a pair of states
  and not a family.

## 2. Decisions

### 2.1 A family is one entry, like a pair

`CustomIconEntry.variants` holds the members, in drawing order, beside the role and the look they
share. It composes with the mechanism a two-state pair already uses rather than adding a second one:

- **One pick, a component per member** (`iconComponentCount`), so the roster's capacity, the tick,
  the parser and the shelves count it as they count a pair.
- **One inventory line with `parts`** (`iconRosterEntries`), so the balanced cut keeps the family on
  one sheet as it keeps a pair, and the generator draws the siblings side by side to one design.
- **One slot per member, `<id>-<name>`** (`iconSlotNames`), so `checkCustomIcon`'s clash check
  covers every member's sprite with no new rule.
- **Stored inside `entry_json` and `subject_json`**, which both storage backends and the library pack
  already carry whole, so no schema changes: `readCustomIconDraft` reads the members and
  `checkCustomIcon` holds them to the same gate as every other field.

Separate entries sharing an origin were rejected: editing the shared look would still be one edit per
variant, and nothing would keep the members on one sheet.

### 2.2 The reader names the axis

A member is a name and an optional phrase in the reader's words. The app supplies no axis and no
prompt text per axis, so dose, rarity, damage, condition or anything else a game varies by is the
same control, and nothing the app writes stands between the reader's words and the sheet. The line
reads:

```
Stim injector ×3, one design drawn as a family of three variants in this order: small, a thumb-length pen with one green cell; standard; large, a pistol-grip injector with three green cells — a chrome auto-injector with a green glowing cell
```

A phrase refuses a semicolon and the long dash, since either would move a member's words into the
next member or into the shared look. The sheet's intro now says an entry marked ×2 or more is one
design drawn once for each state or variant it names, which is true of a pair and a family alike.

### 2.3 Rarity agrees with *Rarity Tier* and the tier marks

*Rarity Tier* holds one value for the whole set, and its neutral choice
(`Neutral, Tier Shown By Overlay Marks`) is the one a set mixing tiers takes, with the overlay
sheets' tier marks telling the tiers apart. A family told apart by tier needs exactly that, so the
form warns — never refuses — when a member names a tier while the set's *Rarity Tier* is not the
neutral one (`customIconWarnings`), and the member look's tooltip says which choice to make. The
tiers are read from the field's own pool (`rarityTiers.ts`), not written again.

### 2.4 Size: two to eight

At least two, since one member is a single icon. At most half a sheet (`ICONS_PER_SHEET / 2`), so
the balanced cut has room to place the family whole and its one line stays readable as one icon's
line with every member's name and phrase in it. Eight covers a dose ladder and every rarity a game
names. A member's name is held to a state's 24 characters, since it ends a file name, and its phrase
to 80, since the shared look says the rest.

### 2.5 The form

*Two states* became *Drawn as*: *One icon*, *Two states of one icon* or *A family of 2 to 8
variants*, one control because an entry is a pair or a family and never both. The family shows a
name and a look field per member with a Remove button, and an *Add a variant* button below; each
button is disabled at its bound with a card that says which bound. The keyboard follows the list: an
added member's name takes focus, and a removal hands focus to the member that moved into the place.

## 3. Not done

The catalogue's own tiered roles stay separate entries: they are written per family of world, and
turning them into families would change every saved set that ticks one.
