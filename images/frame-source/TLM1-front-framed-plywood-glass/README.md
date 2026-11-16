# Plywood frame with subtle glass

The main website image is `../../TLM1-front-framed-plywood-glass.jpg`: a 1920 × 1480 progressive JPEG, approximately 348 KB. Matching 1280 × 987 and 768 × 592 JPEGs are approximately 157 KB and 57 KB. WebP alternatives are also included. Exact file sizes are in `../../TLM1-front-framed-plywood-glass.json`.

This variation adds very faint reflections and narrow optical edge shading inside the existing old plywood frame. The photo and framing geometry match the preceding plywood version: a 1760 × 1320 photograph with an 80-pixel frame. Earlier versions and the original source photograph remain available.

## Source components

- `frame-generated.png`: the same approved plywood frame component as the previous version.
- `glass-generated.png`: transparent reflection layer from the built-in imagegen tool.
- `glass-edge-generated.png`: generated optical edge layer; only narrow strips at its top and left are used.
- `generation-prompts.json`: both complete imagegen prompts.
- `provenance.json`: component origins and processing notes.
- `build.cjs`: reproducible compositing, compression, and validation.

The photograph itself is never regenerated. The script resizes the original photo, assembles the existing plywood frame, then applies the transparent effects only within the photograph's rectangle. Reflections use 18% of the generated layer's alpha, with a small blur; top and left edge shading use 28% alpha and occupy an eight-pixel inset. These are layer-strength multipliers, not uniform opacity across the whole image. Most of the photograph remains completely unaffected before compression.

The build validates that the base photograph is unchanged before adding glass, the frame pixels remain identical before compression, the source PNG is unchanged, and all six exports have the expected dimensions and are opaque. JPEG and WebP encoding can make minor pixel changes at boundaries.

## Rebuild and website use

Run `npm install`, then `npm run build` from this directory. Optional arguments are `node build.cjs [source-photo] [output-directory]`. The default source is the original `../../TLM1-front.png`, and outputs go to the images directory two levels above.

Use the `-768.jpg`, `-1280.jpg`, and unsuffixed `.jpg` files in a 768w/1280w/1920w `srcset`; use a `sizes` value matching the page layout. Set image width/height to 1920/1480 and CSS `width:100%;height:auto` to keep its proportions. The glass effect is already baked into the image and needs no browser overlay.

Set `FRAME_PROOF_PATH` to a local PNG path when a lossless proof is needed for inspection. That temporary proof is not required on the website.
