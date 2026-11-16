# The Living Members — approved speaker vibration

The active `../../the-living-members-animated-1.gif` is the user-approved speaker-cone vibration: 2.5 seconds still, four 50 ms vibration frames, 1 second still, then five 50 ms vibration frames. The 3.95-second cycle loops indefinitely.

The 1280 × 355 GIF has a transparent background and 11 frames, including the two still holds. It transforms the original PNG as a whole, with tiny alternating scale, translation, and rotation changes that diminish after each hit. The second hit is slightly stronger. No image generation is involved.

Run `npm install` and `npm run build` to rebuild under `render/`, or `node build.cjs /absolute/output/directory`. The original PNG is retained in `reference/`. The build verifies frame timing, transparency, empty borders, identical still holds, and stable pixel counts.

The earlier shuffle and bone workflows are retained in sibling draft directories.
