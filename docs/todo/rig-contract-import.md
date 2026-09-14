# Rig contract import — the prompt states the engine's own piece geometry

> **Status:** 🟢 ACTIVE — issue #294. The writer (BootBlock/unsung-saviour#720) has shipped; this is
> the reader.

## 1. What is wrong

A `CUTOUT_RIG_SINGLE_DIRECTION` prompt tells the model the size of the assembled figure and nothing
about the size of any piece. Section 2 says *48 × 96 px assembled* and then says outright that no
single component is that size. Section 5 says a pivot is the centre of a joint cap, but not how long
a piece is against the figure or where along it the joint sits.

An engine rig fixes all of that before any art exists. Unsung Saviour's humanoid contract declares,
in a 48 × 96 frame, a 20 × 20 head, a 26 × 26 torso, a 7 × 20 lower arm and a 14 × 8 foot, each with
a pivot and a bone rest position. Its Rig Intake registers each piece flush against its joint edge at
one scale for the whole actor, padded and never resized — so a piece drawn to the model's proportions
rather than the rig's opens a gap or an overlap at a joint.

The same missing input is why three things are kept in step by hand: the inventory part names in
`src/constants/sheetPlans/character.ts`, the engine's `pack_piece_name` for each slot, and the
Unsung Saviour presets' technical values.

## 2. The input

`unsung-saviour#720` ships the file. It is one versioned JSON document, written by the Rig Intake
tab's `Export contract...` action:

```json
{
  "format": "unsung-saviour-rig-contract",
  "version": 1,
  "skeleton_name": "Humanoid",
  "frame_size": { "width": 48, "height": 96 },
  "facings": ["east", "south_east", "…"],
  "slots": [
    {
      "slot_id": "torso",
      "pack_piece_name": "torso",
      "parent_slot": "pelvis",
      "piece_size": { "width": 26, "height": 26 },
      "piece_pivot": { "x": 13.0, "y": 24.0 },
      "joint_edge": "bottom",
      "rest_position": { "x": 0.0, "y": -8.0 },
      "rest_position_in_frame": { "x": 0.0, "y": -56.0 }
    }
  ],
  "draw_orders": { "east": ["upper_arm_l", "…"] }
}
```

**The format belongs to the writer.** This app reads it and never writes one. `format` and `version`
are what a reader can check; everything else is the rig.

## 3. Shape

### 3.1 One authority for the file

`src/utils/parseRigContract.ts` turns an unknown value into `RigContract | null` and says why when it
refuses. **Both readers go through it** — the studio's file import and `parseImageConfig`, which
reads the same object back out of a stored row. A second, laxer path on the storage side would let a
contract that the import refused come back from the database.

`src/types/rigContract.ts` holds the type this app uses. It is the document minus `draw_orders`,
which nothing here can say anything with: a sheet generator draws pieces, it does not layer them.

### 3.2 Where it is kept

On `ImageOutputConfig`, as `rigContract: RigContract | null`.

**Because the compiled prompt has to be reproducible.** A history row stores `output_json` and
restores from it; a preset carries an `ImageOutputConfig`. A contract held anywhere else would make
a restored row recompile to a different prompt from the one it recorded, silently. Both backends
store that field as part of the same JSON blob, so no schema changes.

### 3.3 One seam, four consequences

The rig sheet's inventory *is* a plan (`SheetPlan`), and the inventory prose, the component names
and the component count are all derived from the plan already. So the contract overrides the plan,
once, in `drawnPlanFor` — and section 4's list, `componentSlots` and the count the Sprites panel
checks all follow with no further change.

`rig: RigContract | null` becomes a trailing parameter on `drawnPlanFor`, `componentSlots`,
`componentCountFor`, `componentBreakdownFor` and `sheetIdentity`. A parameter object would read
better at seven arguments and is a refactor of every call site in the suite for a gain this change
does not need; the trailing parameter sits with `mode`, `directions` and `sheetIndex`, which come
from the same configuration.

The override applies only where the plan **is** the rig — the one entry `fixedRigMode` reads — and
only under `CUTOUT_RIG`. On any other sheet a loaded contract is inert, and the studio says so.

### 3.4 What the prompt gains

- **Section 4** lists one entry per slot, in the contract's own order, named as the engine names it
  (`pack_piece_name`). That order is the atlas column order, so the manifest and the pack name each
  piece as the engine does.
- **Section 5** gains a per-piece block: each piece's size as a share of the assembled frame, which
  end of it the joint is at, and where the pivot sits along it.
- **Section 2** takes the assembled size from `frame_size` rather than from typed prose.
- **The native grid** follows from the contract: the largest piece is the cell, the slot count is
  what has to be seated, and the whole-number multiple is derived from those. Today this is gated on
  `resolutionProfile === 'CUSTOM'` because the field is free prose and only the reader knows what it
  means. A contract is not prose, so that gate does not apply to it.

### 3.5 The presets

`us-character-rig` and `us-creature-rig` keep their `spriteTargetSize` and `EIGHT_COMPASS` as the
**no-contract fallback**, and their docblock states that a loaded contract supersedes both. Nobody
has to update them when the rig changes any more, because a reader with the file gets the rig's own
numbers. Deleting them outright was considered and rejected: it leaves a reader without the file
holding a prompt that states no size at all.

## 4. What pins it

- The parser: a good document, a wrong `format`, an unknown `version`, a missing field, a slot with
  no name, and a frame that encloses nothing.
- The seam: the plan, the slot names and the count all come from the contract on a rig sheet, and
  none of them does on any other sheet or under any other rig mode.
- The prompt: compiled under `CHARACTER` / `CUTOUT_RIG_SINGLE_DIRECTION` / `EIGHT_COMPASS` with and
  without a contract, and under a non-rig sheet with one loaded.
- The round trip: a contract stored in `output_json` and read back is the contract that went in, and
  a row written before this field existed reads back as no contract rather than as a broken one.

---

## STATUS LOG

### (1) 2026-09-14 — design settled

Written after the writer landed, against the real exported document rather than against the issue's
description of it. The one open question put to the maintainer was what the presets keep; the answer
is §3.5.
