> Archived bone-animation draft, superseded by the subtle shuffle. Its build is retained for reference; the GIF in the images directory is the newer shuffle.

# The Living Members — bone animation 1

The animation uses 1,868 small black human-femur silhouettes. They drift and tumble from a scattered arrangement into the supplied two-line title, resolve to the original lettering for a two-second pause, and disperse along different curved paths. The end returns continuously to the starting arrangement. No video frames or artwork from the reference video are included.

The production GIF is `../../the-living-members-animated-1.gif`. It is 1280 × 520 pixels, with a white background, a 12-second duration, 20 rendered frames per second, and infinite looping. Identical held frames are combined by the encoder. The GIF uses a limited palette to reduce file size; its background is opaque.

## Rebuild

Run `npm install` and `npm run build` in this directory. Outputs are written under `render/`. To specify another destination, run `node build.cjs /absolute/output/directory`. Copy the selected GIF into the images directory after reviewing it.

`build.cjs` contains the canvas dimensions, timing, random seed, bone count sampling, movement, and export settings. `reference/the-living-members.png` is the unchanged user-supplied title image. `reference/femur-generated.png` is the original bone artwork produced with the built-in ImageGen tool; its prompt is in `reference/generation.json`. Animation and frame export use Canvas and Sharp.

The bone destinations are sampled from the supplied image, preserving the original letter placement, tilt, spacing, and two-line composition. Near the middle of the loop, the bone formation blends into the original title. The animation therefore resolves to the supplied lettering rather than remaining a sparse pattern of individual bones during the pause.

The build validates the exact procedural loop endpoint, output dimensions, infinite-loop flag, and total playback duration. `verification.json` additionally records a decoded-GIF seam check and comparison of the held lettering with the input-derived title frame.

For websites, use the GIF as an ordinary image with descriptive alt text. Provide the static PNG for visitors whose `prefers-reduced-motion` setting requests less animation.
