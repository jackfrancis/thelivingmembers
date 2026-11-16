# The Living Members — subtle shuffle

The active `../../the-living-members-animated-1.gif` animates the supplied PNG directly. All 16 original letter shapes, their placement, and the transparent background are preserved. The source is not redrawn or regenerated.

The GIF is 1280 × 355 pixels with 8 unique frames, 200 milliseconds per frame, and infinite looping (1.6 seconds per cycle). Each letter moves independently by at most 1.1 pixels horizontally, 0.9 pixels vertically, and 0.38 degrees of rotation. Sixteen pixels of transparent padding allow the motion without clipping. GIF transparency has a binary alpha channel.

## Rebuild

Run `npm install`, then `npm run build`. The outputs are written to `render/`. To choose another output directory, run `node build.cjs /absolute/output/directory`.

`reference/the-living-members.png` is the unchanged original. `build.cjs` finds the 16 connected letter shapes, crops their original pixels, applies small periodic transforms, and encodes the GIF. It also exports a static PNG for reduced-motion use. No ImageGen call is used for this animation.

The build verifies the 16 letters, exact return to the initial pose, 8 encoded frames, playback duration, infinite-loop setting, transparent corners, and stable visible-pixel counts across decoded frames to detect trails or missing letters. `animation-info.json` records dimensions, file size, and motion bounds.

This replaces the earlier bone animation. Its source is retained in the sibling `the-living-members-bones-draft` directory.
