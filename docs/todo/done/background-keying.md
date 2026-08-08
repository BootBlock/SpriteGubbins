# Background keying — implementation plan

> **Status:** ✅ COMPLETE — shipped whole, including the checkerboard the preview needed to show it.

Turning a returned sheet's flat key field into alpha, in the Quantise tab.

## Why this exists now

[`post-generation-quantisation.md`](post-generation-quantisation.md) §7 named background keying as
**explicitly out of scope**, "genuinely useful and genuinely separate; it needs its own tolerance and
edge-decontamination handling". That decision stands as a record of what that phase built. This plan
supersedes it, and the reason it does is a returned sheet.

A model was asked for section 0's `MAGENTA_FF00FF` field and delivered a background that was
*visibly* magenta and **almost nowhere actually `#FF00FF`** — the pixel values drifted across the
field. That is the ordinary case, not a bad generation: a generative raster has no flat-fill
operation, and any lossy re-encode on the way out moves the numbers again.

Two consequences, and they are the whole feature:

1. **An exact `=== #FF00FF` match keys almost nothing.** Whatever removes the field has to admit a
   neighbourhood around the key colour, not a single value.
2. **The sprite's edges are contaminated.** Anti-aliasing blends the key colour into the artwork
   beside it, so removing the field exactly leaves a magenta halo one to three pixels wide — which is
   worse than not keying at all, because it is now baked into an image the user believes is clean.

No prompt wording fixes either. The template already says the field is uniform and exact; this is the
same class of problem the Quantise tab was built for in the first place — a guarantee the app can
make on the returned pixels because it does not depend on a model complying.

## Where it goes in the pipeline, and why there

```
ImageData → keyBackground → alignToGrid → downscaleNearest → applyPalette → ImageData
            (new)
```

**Before `alignToGrid`, not after** — this is the load-bearing decision in the plan.

`alignToGrid` reduces each `grid × grid` cell to its **modal** colour: the one the most pixels in the
cell already carry. On a drifting magenta field every background pixel is a *distinct* colour, so
each of them polls exactly one vote — and a plurality of one is beaten by any colour appearing twice.
Take an 8 × 8 cell straddling a sprite edge: 62 pixels of never-repeating magenta and 2 pixels of one
flat sprite colour. Every magenta polls 1, the sprite polls 2, and the cell resolves **entirely to the
sprite**. Two pixels in sixty-four is enough, so the sprite dilates into its own background by up to a
whole grid cell on every side — at a grid of 8, eight pixels of it.

Keying first collapses that field to one value — fully transparent — before the vote is taken. The 62
magentas become 62 votes for the same thing, they beat the sprite's 2, and the cell resolves to
transparent. The alignment step gets the edge right for exactly the reason it got it wrong.

It also means the grid vote is doing most of the edge decontamination for free: a one-pixel fringe
inside an 8 × 8 cell is 12% of the vote and loses.

Downstream needs no change and gets two things right already: `colorHistogram` excludes fully
transparent pixels, so the keyed field claims no palette slots and `applyPalette` copies it through
untouched.

**Transparent pixels must be written canonically as `{0, 0, 0, 0}`.** `alignToGrid` compares packed
RGBA, so a "transparent" pixel that kept its original RGB under `a: 0` is still a distinct colour to
the modal vote, and the collapse above would not happen. This is the detail the whole ordering
argument rests on.

## The algorithm

Two passes over the source, one mask between them.

**Pass A — the field.** Build a `Uint8Array` mask, one byte per pixel, set where the pixel is either
already fully transparent or within `tolerance` of the key colour.

**Pass B — the fringe, and the output.** For each pixel:

- masked → write `{0, 0, 0, 0}`;
- **4-adjacent to a masked pixel** and within `tolerance × FRINGE_TOLERANCE_FACTOR` of the key
  colour → write `{0, 0, 0, 0}`;
- otherwise copy through unchanged.

The mask is what makes pass B non-cascading: it reads pass A's state, never its own output, so the
erosion is exactly one pixel deep and cannot flood into a gradient. That bound is the point — an
iterative version is a flood fill that eats soft artwork, and "one pixel of fringe" is what
anti-aliasing actually produces.

The geometric restriction is what makes the wider threshold safe. `tolerance × 3` around magenta
would swallow a genuinely magenta-ish sprite colour if it applied everywhere; restricted to pixels
that *touch the field*, it only ever reaches pixels that are by construction blends of it.

Scaling the fringe threshold off the user's tolerance rather than giving it its own control means
tolerance 0 makes pass B a no-op — "exact match only" stays exactly that, with no second knob to
discover. `FRINGE_TOLERANCE_FACTOR` is **3**: a blend has to be roughly three-quarters key colour to
be eroded, which is the part of the halo that still reads as key colour rather than as artwork.

**Against a dark or light key this will eat some genuine edge.** With `PURE_BLACK` selected, a
sprite's own black contour *is* within the fringe threshold of the key, and it does touch the field —
so it goes. That is not a defect in the erosion, it is what keying a sheet against a colour its
artwork also uses costs, and it is the reason `MAGENTA_FF00FF` is the recommended key and the reason
this feature is opt-in rather than automatic. The control says so.

**Distance is Euclidean across RGB, alpha ignored.** Euclidean because `nearestColor` already defines
what "how far apart are two colours" means in this app and a second metric would be a second answer.
RGB-only because a key field is opaque by definition and a semi-transparent pixel over it is the
user's own artwork.

## What the user controls, and what they do not

**The key colour is not a control here.** It comes from the studio's `backgroundKey`, exactly as the
palette limit comes from the studio's `paletteLimit` — the sheet was generated against a prompt that
already stated it, and a second copy on this tab would be a second source of truth for a value the
generation was made against. `BACKGROUND_KEY_COLORS` already maps it to pixels for `identityPalette`.

**The tolerance is**, because it is a property of *this returned raster* — how far this particular
generation drifted — not of the prompt. That makes it the pixel grid's sibling, and it lives beside it
in `useQuantiseStore` for the same reason.

**A ladder of tolerances, not a slider.** A range input re-runs the whole pipeline on every pointer
move, and the pipeline is linear in a sheet that may be 16.7 megapixels — a drag would be a
recompute per frame. Stepped buttons match what this tab already does twice (the zoom levels, the
grid candidates), give the same reach in one click, and each click is one recompute.

**A `TRANSPARENT` key has nothing to key.** `BACKGROUND_KEY_COLORS.TRANSPARENT` is `null` — the field
is already alpha, and there is no colour to match. The toggle is unavailable in that state and says
which studio setting made it so, through `CheckboxField`'s `disabledReason`, which exists for exactly
this and keeps the control in the tab order so a keyboard user hears the reason.

**Keying is off by default and opt-in.** Two reasons, and the second is the real one:

- `PURE_WHITE` and `PURE_BLACK` are offered keys, and a tolerance generous enough to catch a drifting
  white field also eats the sheet's own highlights. Off-by-default means that never happens to
  someone who did not ask for it.
- The panel's own copy promises "every colour in the result is one the image already contained".
  Silently deleting a third of the sheet contradicts it. An explicit control with a live preview does
  not.

**The enable flag and the tolerance survive a new image; the grid does not.** The grid is a
measurement of one image and a stale one silently mis-scales the next, which is why `setSource`
clears it. Keying is a standing intent about a workflow — the splitter's eight sheets are eight
passes at the same settings — and its effect is visible in the preview either way.

## The preview has to show transparency

`PanViewport` is `bg-foundry-950`, near-black. A canvas keyed to alpha over it renders
indistinguishably from a canvas painted black, so the tab's central claim would be invisible in the
tab's own preview — and a user would download a file believing the wrong thing about it.

A `bg-checkerboard` utility on the `<canvas>` itself fixes it: a canvas's transparent pixels composite
over its own CSS background, so the board shows through exactly where there is nothing painted and
nowhere else. On both panes, not just the result — an imported PNG can arrive with alpha too, and a
fully opaque image covers the board completely, so this is a no-op for every sheet that has no
transparency to show.

## Work list

**New**

| File | What |
| --- | --- |
| `src/utils/keyBackground.ts` | The pure transform: the two passes above. |
| `src/utils/keyBackground.test.ts` | Drift, fringe, non-cascade, the canonical-transparent invariant. |
| `src/constants/quantiser.test.ts` | The ladder's own invariants — chiefly that the default is *on* it, without which nothing renders selected. |
| `src/components/quantise/KeyingControls.tsx` | The panel: toggle, key colour, tolerance ladder, and the share readout. Both the share and the resolved keying come from the tab as props — the "is keying on" rule is over two settings, and deriving it here as well is how the panel comes to claim a pass the pipeline skipped. |
| `src/components/common/SegmentedChoice.tsx` | The row-of-pills control, **extracted from `ComparisonToolbar`'s zoom buttons rather than written a second time**. Decided during implementation: the tolerance ladder is the same control down to the `aria-pressed` the forced-colours block keys off, and CLAUDE.md's DRY law makes the second copy the finding. |

**Changed**

| File | What |
| --- | --- |
| `src/types/quantiser.ts` | `BackgroundKeying`; `QuantiseSettings.key`; `QuantiseResult.keyedShare`. |
| `src/utils/quantiseImage.ts` | Run keying first; report the share — `0` where keying is off. |
| `src/utils/imageData.ts` | Export `toHex`, lifted out of `identityPalette.ts` — the panel needs it too. |
| `src/utils/identityPalette.ts` | Import `toHex`; note where the tolerance argument it declines is answered. |
| `src/constants/quantiser.ts` | `KEY_TOLERANCES`, `DEFAULT_KEY_TOLERANCE`, `FRINGE_TOLERANCE_FACTOR`, tooltips. |
| `src/stores/useQuantiseStore.ts` | `keyingEnabled`, `keyTolerance`, setters, and why they outlive a new image. |
| `src/components/tabs/QuantiseTab.tsx` | Resolve the key colour, pass the settings, mount the panel. |
| `src/components/quantise/ComparisonPane.tsx` | `bg-checkerboard` on the canvas. |
| `src/components/quantise/ComparisonToolbar.tsx` | Its zoom pills give way to `SegmentedChoice`, which is what makes that an extraction rather than a second implementation. |
| `src/components/quantise/ImageComparison.tsx` | `1 colour`, not `1 colours` — a count of one was unreachable until the key field could be removed, and the first sheet driven through the browser said "1 colours". |
| `src/index.css` | The `@utility bg-checkerboard`. |
| `tests/design-tokens.test.ts` | `bg-checkerboard` in `REQUIRED_UTILITIES`. |
| `CLAUDE.md` | A design-token table row for it. |
| `src/utils/quantiseImage.test.ts` | The new settings shape; keying inside the pipeline. |
| `src/components/quantise/ImageComparison.test.tsx` | The new result shape. |

## Tests

The transform is pure, so this is where correctness is established:

- a drifting field within tolerance is keyed; one outside it is not;
- **the ordering claim**, run end-to-end through `quantiseImage`: a drifting field around a sprite
  edge resolves to transparent rather than dilating the sprite;
- the fringe pass erodes exactly one pixel and does not cascade across a gradient;
- an interior pixel the fringe threshold would admit is untouched because it touches no field;
- keyed pixels are `{0, 0, 0, 0}` regardless of what RGB they carried;
- tolerance 0 keys exact matches only, and the fringe pass does nothing;
- `keyedShare` counts pixels that were opaque and became transparent, not pixels that arrived
  transparent, and is `0` with keying off;
- **keying off leaves the pipeline byte-for-byte as it was** — the regression guard for a feature
  inserted at the front of an existing transform;
- `DEFAULT_KEY_TOLERANCE` is on the ladder the buttons offer.

## Deliberately not done

- **Unmixing.** Recovering a fringe pixel's true colour by solving the blend against the key needs a
  per-pixel alpha estimate and produces colours the image never contained — which is what
  `alignToGrid` and `buildPalette` both refuse a step later. Eroding the halo is the honest operation
  for hard-edged sprite art; a half-blended pixel that survives reads as an outline, which is what
  the art wants anyway.
- **A second, independent fringe threshold.** One knob, one behaviour to explain.
- **Keying in `identityPalette`.** Its exact match is deliberate and documented: with no geometric
  restriction, a tolerance loose enough to catch drift against `PURE_WHITE` would eat the sheet's own
  highlights. The digest's answer to fringe is to quantise the sheet first, which this makes work.
- **Component extraction** and **batch processing** stay where §7 put them.
