# Post-generation quantisation — implementation plan

> **Status:** ✅ COMPLETE — shipped as the Quantise tab, closing
> [baseline-prompt-new.md](../baseline-prompt-new.md) §10.4. Kept for the design rationale — above
> all §2's ordering argument and §2.4's median-cut-over-k-means case — rather than as current
> guidance.
>
> Where the implementation and the text below disagree, recorded here rather than edited into the
> body — two questions §4 left open, and two places the file layout was overruled:
>
> - **Each median-cut box contributes its most frequent colour, not its average.** §2.4 named the
>   partitioning algorithm but not the representative. The average is what most implementations use
>   and it invents a colour that was not in the image — exactly what §2.2 refuses to do a step
>   earlier — so the modal colour is taken for the same reason, and every colour in a result is one
>   the source already contained. See `src/utils/medianCut.ts`.
> - **`PixelGrid` is a documented alias over `number`**, not a distinct type the compiler can check.
>   §4 listed it among the type file's exports without saying which; a brand would have to be
>   constructed and unwrapped at every boundary for no benefit the bounded control does not already
>   give.
> - **§4's `medianCut.ts` and `pixelGrid.ts` each shipped as two files**, because holding what §4
>   assigned them ran past the under-150-line target §4 itself sets, and in both cases the file was
>   over because it held two things rather than one. Choosing colours from an image and mapping any
>   image onto any palette are different algorithms (`medianCut.ts`, `applyPalette.ts`); so are
>   asking what scale a sheet was drawn at and transforming it to that scale (`pixelGrid.ts`,
>   `gridAlignment.ts`).
> - **§4's `useImageImport.ts` shipped as three files, and no longer exists under that name.** The
>   studio's identity-lock palette capture needs the decode but must not claim the window's paste,
>   which would rewrite the lock whenever a user pasted a screenshot meant for elsewhere. So the one
>   hook became `useImageFile.ts` (a file to `ImageData`), `useImagePaste.ts` (the window listener,
>   added only by this tab) and `useFileDropTarget.ts` (the drag state both drop targets share). The
>   §4 table still names the original; this is the entry that supersedes it.
>
> **§2.1's `spriteTargetSize` candidate is computed**, which took a relation §2.1 did not state. The
> field is free prose — the shipped presets hold *"48 × 96 px assembled (2 metres tall at 48 px per
> metre)"* — so `parseTargetSize` takes the first `W × H` pair and refuses to guess from loose
> numbers. It names a *component*, and the bridge to a sheet scale is how many components the sheet
> has to carry: `targetSizeGrid` answers the largest scale at which the canvas can still seat them
> all. That is an upper bound rather than a measurement — a generator that left canvas empty drew
> finer — so `GridControls` offers it as a scale to click beside the measured one, exactly the
> "offered as a candidate … never silently preferred" §2.1 asks for.
>
> Two files the plan did not anticipate: `src/test/images.ts`, because the test files need the same
> `ImageData` builders and one implementation of them beats several that drift; and
> `src/utils/targetSize.ts` for the above.
>
> **What this made possible next**, recorded because the reasoning starts here: §10.3 asked for the
> identity lock to be captured from an accepted sheet by a vision model, which this app cannot call.
> Its *palette* line needs no model — `identityPalette.ts` reads it out of the pixels with
> `buildPalette` and `nearestColor` from this pipeline — so that half now ships as
> `IdentityPaletteCapture` in the studio, and only the prose half is removed. That reads a sheet's
> key colour to exclude it, which is **not** the background keying §7 rules out of scope: nothing is
> turned into alpha in an output image.
>
> One stale pointer the plan could not have known about: §7 sends a reader to
> [baseline-prompt-new.md](../baseline-prompt-new.md) **§10.3** for "the manifest work". §10.3 is the
> identity-lock capture; the manifest is `EMIT_MANIFEST`, described in that document's §4.

The one item on §10's follow-up list that **no prompt wording can fix**. Models return smooth
artwork downscaled far more often than true pixel art however the request is phrased — the template
already says *"do not produce smooth artwork that has been downscaled"* in section 2 and *"no
anti-aliased silhouette edges"* in section 9, and it still happens. Palette reduction plus grid
alignment **on the returned image** is the only reliable guarantee, because it is the only step that
does not depend on a model complying.

This is the app's first capability that reads a file rather than composing text, so the plan below
is as much about what it must *not* become as about what it does.

---

## 1. Non-negotiables

- **Entirely client-side.** `File` → `ImageBitmap` → `<canvas>` → `ImageData` → `<canvas>` →
  download. No upload, no fetch, no proxy. The app has no server and must not gain one — this is
  the same rule as [CLAUDE.md](../../../CLAUDE.md)'s "never makes an outbound model call", and an image
  the user is about to ship is exactly the payload that must never leave the tab.
- **No new runtime dependency.** Median cut and grid detection are around 150 lines of arithmetic
  between them. A quantiser package would be a supply-chain surface, a licence to vet and a bundle
  cost for something the app can express directly. If implementation proves that wrong, it comes
  back here for agreement before a package is added.
- **The maths is pure and lives in `src/utils/`.** Every function below is `ImageData` in,
  `ImageData` (or a plain value) out — no DOM, no store, no `navigator`. That is what makes it
  testable, and the tests are where its correctness is established.
- **The DOM work lives in `src/hooks/`.** Decoding a dropped file, reading a canvas and offering a
  download all touch browser APIs, so none of it may sit in `src/utils/`.
- **Cross-origin isolation is unaffected.** Nothing here loads a subresource; a `blob:`/`data:` URL
  from the user's own file is same-origin and unaffected by COEP `require-corp`.

---

## 2. The pipeline, and why in this order

```
ImageData  →  detectPixelGrid  →  alignToGrid  →  downscaleNearest  →  quantise  →  ImageData
                (or from the       (cells become     (one pixel per      (palette
                 target size)       one colour)       cell, exact)        reduction)
```

**Align and downscale come before palette reduction.** Two reasons, both load-bearing:

1. **Anti-aliasing fringes must not claim palette slots.** A downscaled smooth render is mostly
   intermediate edge colours by pixel count. Quantising first would spend a 32-colour budget
   describing the blur the step exists to remove.
2. **It is what keeps this on the main thread.** A 2048×2048 sheet is 4.2M pixels; at a detected
   grid of 8 that is 65k after downscaling, and the expensive histogram-and-split runs on the small
   image. The two full-size passes (detection, alignment) are single linear scans.

If profiling later shows a stall on large sheets, the pure functions move to a worker unchanged —
the split in §4 is already the one that allows it. Not doing it now is deliberate: the app has one
worker already ([`src/db/sqliteWorker.ts`](../../../src/db/sqliteWorker.ts)) and its message bridge is
the most intricate part of the codebase. A second is not worth adding speculatively.

### 2.1 Grid detection

`detectPixelGrid(image): number | null`

For each candidate `n` from `MAX_DETECTED_GRID` down to 2, score the fraction of `n × n` blocks whose
pixels are **all identical**. Return the first (largest) `n` scoring at or above
`GRID_DETECTION_THRESHOLD`; `null` when none does.

- `null` is the honest answer for genuinely smooth artwork, and it is a *useful* one: it tells the
  user the model returned a painted image rather than pixel art at a scale. The UI then requires an
  explicit grid rather than guessing.
- Largest-first, because a true grid of 8 also scores perfectly at 4, 2 and 1. The coarsest grid
  that holds is the real one.
- Exact equality rather than a tolerance. A tolerance turns a near-flat gradient into a false grid,
  and the alignment step immediately after is what handles imperfect cells.

Where the studio's `spriteTargetSize` names a size (`48 × 96 px`), it is offered as a candidate
alongside the detected value — but never silently preferred. It describes the *component*, not
necessarily the sheet's pixel scale, and a user who typed it for the prompt did not thereby ask for
it here.

### 2.2 Alignment

`alignToGrid(image, grid): ImageData` — same dimensions; every pixel in each `grid × grid` cell is
replaced by that cell's **modal** colour (most frequent exact RGBA, ties broken by scan order, so it
is deterministic).

Modal rather than mean: an average **invents a colour that was not in the image**, which is the
opposite of what a palette-limited sprite wants. Where every pixel in a cell is unique — smooth
artwork — the modal colour is the first in scan order, and the quantise step then collapses the
result.

**This is idempotent**, and the test suite pins that: aligning an aligned image changes nothing,
because each cell is already one colour. That property is what makes the step safe to re-run and is
the clearest single check that it did what it claims.

### 2.3 Downscale

`downscaleNearest(image, grid): ImageData` — `⌈w/grid⌉ × ⌈h/grid⌉`, taking the top-left pixel of
each cell. After alignment this is exact and lossless rather than a sampling choice.

Trailing partial cells (when the dimensions are not a multiple of the grid) are kept and take
whatever they contain, rather than being cropped. Cropping would silently delete a column of a
sprite sheet.

### 2.4 Palette reduction — median cut

`buildPalette(image, maxColors): readonly Rgba[]` then `applyPalette(image, palette): ImageData`.

**Median cut, not k-means.** Both are real quantisers and k-means generally scores better
perceptually, but median cut is **deterministic** — no seeding, no iteration budget, no
`Math.random`. That matters twice over: the same image always yields the same sheet, which is what a
user re-running a batch needs, and the tests can assert an exact palette rather than a tolerance.

The classic algorithm splits into `2^n` boxes; this variant repeatedly splits **the box with the
greatest channel range** until `maxColors` boxes exist, so any `k` works rather than only powers of
two.

Decisions inside it:

- **RGB, not a perceptual space.** OKLab would place boundaries better on photographic input.
  Sprite sheets after alignment are flat colour regions, where the two agree closely, and the app
  carries no colour-space maths today. Recorded here so the option is a known one rather than an
  oversight.
- **Fully transparent pixels are excluded from the histogram and pass through untouched.** Otherwise
  a magenta-keyed sheet's transparent regions would claim palette slots describing nothing.
- **No dithering.** It is the standard companion to quantisation and it is wrong here: the template's
  pixel-discipline block bans exactly the "sparkle noise, scattered single-pixel highlights"
  ordered dithering produces. Not offered rather than offered and defaulted off.

Colour counts come from the studio's own `PaletteLimit`:

| `PaletteLimit` | Colours |
| --- | --- |
| `STRICT_32_COLOR` | 32 |
| `RESTRAINED_64_COLOR` | 64 |
| `EXPANDED_ALBEDO` | 128 |
| `UNRESTRICTED` | palette step skipped entirely |

Read from `useOutputStore`, shown in the panel so the user can see which limit is in force, and
changed where it is already changed — in the studio. A second colour-count control here would be a
second source of truth for a value the prompt also states.

---

## 3. Where it lives in the app

**A fourth tab**, not a modal. `AppTab` becomes `'studio' | 'presets' | 'spec' | 'quantise'`.

The three existing modals are each one task with one answer. This is a workspace: a dropped image,
two previews at several zoom levels, a grid control and a download. The atlas modal is already the
densest thing in the app at a third of this surface, and a `<dialog>` that has to scroll two canvases
side by side is the wrong container.

The cost is honest and small: `types/ui.ts`, `TabSwitcher`, and `App`'s `VIEWS` record — which
`satisfies Record<AppTab, ComponentType>` already makes exhaustive, so a missed wiring is a compile
error rather than a dead tab.

**A new component directory, `src/components/quantise/`.** CLAUDE.md's directory list is a closed
enumeration, so this plan is also the proposal to add one line to it. The alternative — filing image
panels under `src/components/studio/` — would put a file in the wrong directory, which that document
calls a design error rather than a filing one.

---

## 4. File layout

Every file one thing, all well under 150 lines.

| File | What it is |
| --- | --- |
| `src/types/quantiser.ts` | `Rgba`, `PixelGrid`, `QuantiseSettings`, `QuantiseResult` |
| `src/constants/quantiser.ts` | `PALETTE_COLOR_COUNTS`, `MAX_DETECTED_GRID`, `GRID_DETECTION_THRESHOLD`, `PREVIEW_ZOOMS`, `MAX_IMAGE_PIXELS` |
| `src/utils/imageData.ts` | pure pixel access: read/write an `Rgba`, pack a colour key, build a histogram |
| `src/utils/medianCut.ts` | `buildPalette`, `applyPalette` |
| `src/utils/pixelGrid.ts` | `detectPixelGrid`, `alignToGrid`, `downscaleNearest` |
| `src/utils/quantiseImage.ts` | composes the four into one pure `(ImageData, QuantiseSettings) => QuantiseResult` |
| `src/hooks/useImageImport.ts` | file picker, drag-and-drop and paste → `ImageData`; owns the `dragover`/`drop`/`paste` listeners and their cleanup |
| `src/hooks/useImageDownload.ts` | `ImageData` → `canvas.toBlob('image/png')` → download |
| `src/components/tabs/QuantiseTab.tsx` | composition only |
| `src/components/quantise/ImageDropZone.tsx` | the empty state and the three ways in |
| `src/components/quantise/GridControls.tsx` | detected grid, manual override, palette limit in force |
| `src/components/quantise/ImageComparison.tsx` | before/after canvases and the zoom control |

`useDownload` is not reused: it builds a `Blob` from a **string**, and a PNG is binary. Widening its
signature to `string | Blob` would make every existing caller pass a type it never uses, so the image
path gets its own hook.

### Input handling

- **File picker** — a labelled `<input type="file" accept="image/*">`.
- **Drag-and-drop** — on the drop zone, with `dragover` prevented so the browser does not navigate.
- **Paste** — a `paste` listener on the window while the tab is active, reading
  `clipboardData.files`. Registered in an effect that returns its removal, per the effect-cleanup
  rule.

Decode with `createImageBitmap(file)` and draw once into a canvas to read `ImageData`. Anything that
is not a decodable image raises a toast and changes nothing — the app's existing failure vocabulary.

`MAX_IMAGE_PIXELS` bounds what is accepted, for the same reason `MAX_ANATOMY_MULTIPLIER` exists: a
40000 × 40000 PNG is a frozen tab, and the honest response is to decline it with a message rather
than to appear to hang.

---

## 5. Preview and output

- **Before and after side by side**, each on a `<canvas>` with `image-rendering: pixelated` — a
  smoothed preview of a nearest-neighbour result would misrepresent the very thing being judged.
- **1:1 and zoomed**, at `PREVIEW_ZOOMS` of 1×, 2×, 4× and 8×. 1:1 is the case that decides whether
  the result is genuine pixel art; the zoom is what makes an individual pixel inspectable.
- **A short factual summary** — detected grid, output dimensions, colours before and after. `emerald`
  where the result is clean, `gold` where the user is being asked to intervene (no grid detected),
  matching the tokens' existing meanings.
- **Download** as PNG, named from the source file.

Nothing is written to the database. The image is the user's, this is a transform, and storing sheets
in OPFS is a different feature with its own quota questions.

---

## 6. Tests

On the pure functions, per the requirement:

| Test | Asserts |
| --- | --- |
| a known input quantises to a known palette size | `buildPalette` over a synthetic image of 200 distinct colours returns exactly 32, and `applyPalette` output contains no colour outside it |
| grid detection finds a known grid | an image built by scaling a 16 × 16 source up 8× detects `8`; a smooth gradient detects `null` |
| alignment is idempotent | `alignToGrid(alignToGrid(x, n), n)` equals `alignToGrid(x, n)`, pixel for pixel |
| downscale after alignment is lossless | upscaling the downscaled result reproduces the aligned image exactly |
| transparency survives | fully transparent pixels stay transparent and contribute no palette entry |
| the pipeline respects `UNRESTRICTED` | colour count is unchanged when the palette step is skipped |

`ImageData` is constructible in happy-dom from a `Uint8ClampedArray`, so none of these needs a real
canvas. The hooks and components are driven in the browser with the `verify` skill instead — a
dropped file and a clipboard image are not things a unit test establishes.

---

## 7. Explicitly out of scope

Named so that they are decisions rather than omissions:

- **Background keying.** Turning the sheet's `#FF00FF` field into alpha is genuinely useful and
  genuinely separate; it needs its own tolerance and edge-decontamination handling.
- **Component extraction.** Cutting the sheet into individual sprites is the *next* tool, and it
  needs the manifest work from §10.3 to be worth much.
- **Dithering**, for the reason in §2.4.
- **Batch processing** of several images. One image, one result; the splitter's eight sheets are
  eight passes, and the shape of a queue here should follow real use rather than precede it.
