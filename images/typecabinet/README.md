# Typecabinet

94 hand-drawn assets: A–Z, digits 0–9, an exclamation point, a period, 17 illustrated symbols, and 39 dimensional character variants from “THE LIVING MEMBERS.” There are 282 production PNGs across three sizes. All use pure black with transparent surroundings and antialiased edges. The original alphabet, digits, and punctuation have solid opaque bodies and transparent counters. The dimensional letters have both filled-front and outline treatments. Symbols retain their drawn outlines and internal linework; unmarked interior spaces are transparent. All assets preserve their individual aspect ratios and have a common baseline.

## Files

- `1024/`: canonical PNG masters. Visible capitals, digits, complete symbols, and the complete exclamation mark are exactly 1,024 pixels tall.
- `256/` and `128/`: smaller PNGs derived directly from the masters.
- `manifest.json`: character mapping, category, fill style, exact file dimensions, visible bounds, file sizes, and baseline information. Illustrated symbols use `character: null` and their filenames as labels.
- `preview.png`: labeled overview of all assets on a checkerboard. `preview-alphabet.png` and `preview-numbers-symbols.png` show the first two source sets separately. `preview-title-filled.png` and `preview-title-outline.png` show each title treatment; `preview-title-sheet.png` includes both treatments and the skull. `preview-title-web.png` assembles the title and skull at their actual 128-pixel export size. Checkerboards appear only in previews. Wide drawings are fitted into their preview tiles, so preview tile heights do not indicate file heights.
- `typecabinet.css`: optional shared sizing and spacing styles.
- `reference/alphabet035.jpg`, `reference/alphabet036.jpg`, and `reference/alphabet038.jpg`: unchanged original 20,400 × 28,080 source photographs.
- `reference/crops/`: individual source crops prepared at 40% of the original resolution.
- `reference/filled/`: selected imagegen outputs before normalization.
- `reference/outlined/`: selected symbol line-art outputs before normalization; these are not filled silhouettes.
- `reference/title/`: selected dimensional letter outputs before normalization, including both treatments of all repeated letters.
- `reference/generation-prompts.json`, `reference/generation-prompts-036.json`, `reference/generation-prompts-038.json`, `reference/correction-prompts.json`, and `reference/A-notes.txt`: generation and correction prompts. `reference/provenance-036.json` records the selected title outputs; `reference/title-catalog.json` maps drawings to source crops and occurrence numbers.
- `reference/crop-bounds.json`, `reference/crop-bounds-036.json`, and `reference/crop-bounds-038.json`: crop coordinates on a 2,720-pixel-wide coordinate grid; multiply by 7.5 to map to the original photographs or by 3 for the working crop sources.

Text glyphs are named `A.png` through `Z.png`, `0.png` through `9.png`, `exclamation.png`, and `period.png`. Filenames are case-sensitive on typical web hosts.

The illustrated symbols are `star-1.png`, `star-2.png`, `star-3.png`, `star-4.png`, `sun.png`, `cloud.png`, `flower.png`, `heart.png`, `cookie.png`, `ice-cream.png`, `campfire.png`, `eighth-note.png`, `beamed-notes.png`, `quarter-note.png`, `guitar.png`, `tree.png`, and `skull.png`. Star numbers follow their left-to-right order in the source. The notes retain the original scribbled markings within their notehead outlines. Symbol interiors are unfilled, including the cloud, heart, petals, flame, logs, guitar body, tree canopy, and skull. The skull retains its bandanna, teeth, eye and nose hatching, and facial linework.

## Dimensional title letters

All 16 drawings in “THE LIVING MEMBERS” are retained, each in two treatments:

- `-filled.png`: solid black front faces, with outlined and hatched side faces. Counters and blank parts of side faces remain transparent.
- `-outline.png`: outlined front faces and hatched sides; all blank spaces remain transparent.

The drawing names, in source reading order, are `T-TLM`, `H-TLM`, `E-TLM-1`, `L-TLM`, `I-TLM-1`, `V-TLM`, `I-TLM-2`, `N-TLM`, `G-TLM`, `M-TLM-1`, `E-TLM-2`, `M-TLM-2`, `B-TLM`, `E-TLM-3`, `R-TLM`, and `S-TLM`. Add the treatment suffix to select a PNG, for example `I-TLM-2-filled.png` or `E-TLM-3-outline.png`.

Numbers identify separate drawings, not resolutions. The three E drawings, two I drawings, and two M drawings keep their individual proportions. Seven additional filled characters (F, D, O, A, C, 8, P) extend the title style for “8 P.M. FIVE DOLLAR COVER.” These are generated style extensions, identified separately in the manifest, rather than drawings from the original sheet. Prompts and provenance are in `reference/generation-prompts-tlm-extensions.json`. The manifest records `family: "TLM"`, the character, drawing name, occurrence, and source order.

All title drawings and the skull use the same visible heights as the existing alphabet, regardless of their original size on the photograph. For dimensional letters, this measurement includes the top and side faces. For the skull, it includes the complete bandanna and ties.

## Dimensions and punctuation

The size names refer to visible cap height (also the complete digit or symbol height), not total canvas height. Transparent padding is proportional at all resolutions:

| Folder | Capital height | Canvas height | Padding per side | Period height | Baseline from top |
| --- | ---: | ---: | ---: | ---: | ---: |
| `1024` | 1024 | 1056 | 16 | 160 | 1040 |
| `256` | 256 | 264 | 4 | 40 | 260 |
| `128` | 128 | 132 | 2 | 20 | 130 |

Widths vary with each drawing. The period sits at the shared baseline within a full-height transparent canvas; do not trim that canvas or give punctuation a separate CSS height. The exclamation mark retains its separate dot. The baseline is the coordinate immediately below the last visible row.

## Website use

Load the CSS and use a single cap-height value for a word or phrase. This example displays 64-pixel-tall letters using the 256-pixel assets, which also supplies sufficient resolution for a 3× display:

```html
<link rel="stylesheet" href="/images/typecabinet/typecabinet.css">
<span class="typecabinet" role="img" aria-label="HI!" style="--cap-height: 64px">
  <img src="/images/typecabinet/256/H.png" alt="">
  <img src="/images/typecabinet/256/I.png" alt="">
  <img src="/images/typecabinet/256/exclamation.png" alt="">
</span>
```

Use `.space` spans for word spaces. For long text, wrap each word separately to control line breaks. Keep a meaningful accessible label on the phrase and empty alt text on its component images. These decorative image glyphs work best for short headings and logos; ordinary text remains preferable for body copy.

CSS changes display size automatically. To optimize downloads further, select the 128-pixel files for smaller lettering, or use `srcset` with actual file widths from the manifest and a matching `sizes` value. CSS alone does not reduce downloaded bytes.

## Rebuilding

From this directory, install the development dependency with `npm install`, then run `npm run build`. Node.js and Sharp are only needed to regenerate the assets, not to serve the PNGs or CSS.

The script makes all pixels pure black, normalizes opacity, proportionally scales the assets, aligns punctuation, generates both web sizes, writes the manifest, and rebuilds the previews. It validates all 282 PNGs for black RGB values, transparent/opaque pixels, canvas heights, visible heights, padding, and baseline alignment. The approved A master is preserved byte-for-byte when it exists. Regeneration overwrites the derived assets and the other masters from the saved filled, outlined, or title references. Normalization preserves the supplied alpha silhouette; it never flood-fills the outlined symbols or dimensional side faces.

The letter shapes were produced with built-in imagegen edits of the original drawings, then normalized mechanically with Sharp. They are faithful visual interpretations, not exact pixel traces. F's faint erased bottom arm was excluded, and stray strokes around I were removed while retaining its irregular contour. The original photograph and source crops are retained for future revisions.

The second sheet uses the same built-in imagegen workflow: digits were filled, while the 16 symbols were extracted as black linework with transparent unmarked interiors. The upper hook of 6 was explicitly filled, and a stray gap on 0 was closed. Later corrections removed the extra loop outside the guitar’s left body contour and the interior curve inside the flower’s lowest petal. The full-size source and selected per-asset references remain available for revisions. The smallest exports retain the illustrations' overall character, although fine strings, hatching, and curls naturally lose detail when reduced further in CSS.

The dimensional title and skull from sheet 036 use the same built-in imagegen workflow. The two T treatments were reviewed before applying both approaches to every remaining drawing. The approved skull is preserved as outline art. Selected raw outputs and source crops are saved so individual drawings can be revised without regenerating the whole set. These remain faithful visual interpretations of pencil drawings, not exact pixel traces.
