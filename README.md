# The Living Members

Static website for [The Living Members](https://thelivingmembers.com/). The page has no runtime dependencies. A Node.js script assembles the public files for Cloudflare Pages.

## Metadata and discovery

- `index.html` contains the page title, canonical URL, Open Graph sharing metadata, and `MusicGroup` JSON-LD.
- `favicon.svg` embeds the existing skull artwork on a light background so it remains visible in light and dark browser tabs.
- `robots.txt` permits public crawling and explicitly allows `OAI-SearchBot` for ChatGPT search.
- `sitemap.xml` lists the canonical homepage. Add public page URLs as the site grows. Only add `lastmod` when it reflects a real content update.

The canonical origin is `https://thelivingmembers.com`. If it changes, update all absolute URLs in `index.html`, `robots.txt`, and `sitemap.xml` together.

The share preview uses the existing framed artwork at its actual size, 1280 × 987. The structured data uses the album artwork in `images/TLM1-album-front.jpg` as the band’s representative image. Add `sameAs` only after official music or social profile URLs are confirmed; there are no placeholder profiles or invented band details.

The crawler rules retain open access for training crawlers as well as search crawlers. Search access and training permission are separate decisions: if the band chooses to opt out of OpenAI training, add a separate `User-agent: GPTBot` / `Disallow: /` group while keeping `OAI-SearchBot` allowed. See [OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots).

Deployment rollout and verification status are tracked in [GitHub issues](https://github.com/jackfrancis/thelivingmembers/issues?q=is%3Aissue+%22Deployment+check%22).

## Building for Cloudflare Pages

```sh
node scripts/build-site.cjs
```

Edit `shows.json` to update the show announcements. Each record has a venue, a local start time with its UTC offset, a lead-in, and the admission wording. Keep the show's `id` when rescheduling so its calendar link and event ID stay the same.

The build renders the lettering, screen-reader text, and a downloadable calendar event for each show in file order. Open `dist/index.html` to preview the result. The build replaces `dist/` with the public pages, calendars, favicon, robots file, sitemap, and referenced images. It runs without package installation.

Configure Pages with build command `node scripts/build-site.cjs`, output directory `dist`, and production branch `main`.

## Running deployment verification

From the repository root, with Python 3:

```sh
python3 scripts/verify_deployment.py
```

The script uses only the Python standard library and defaults to `https://thelivingmembers.com/`. It makes read-only GET requests and exits with status `1` if any automated check fails, or `0` if they all pass. It compares deployed metadata with your current local `index.html`, so unshipped local edits will produce failures.

To check a local preview:

```sh
python3 scripts/verify_deployment.py --base-url http://127.0.0.1:8765/ --timeout 10
```

A server exposing the entire checkout will intentionally fail the source-file exclusion checks. A preview should serve the same selected files as the production deployment. HTTP is accepted only for loopback previews; this does not verify production HTTPS.

For a production-like preview, build first, then run `python3 -m http.server 8765 --bind 127.0.0.1 --directory dist` in a separate terminal. The verifier checks that a missing nested URL returns HTTP 404 and source files are unavailable. Pages serves the top-level `404.html` for missing paths. Python’s preview server uses its own error page, so visit `/404.html` locally to preview the artwork.

Automated coverage:

- **Published files:** successful responses for the homepage, robots, sitemap, favicon, and HTML/CSS/metadata image references; appropriate content types; no HTTPS downgrade; probes for exposed README, verifier source, and asset-project package files.
- **Crawler access:** restrictive `X-Robots-Tag` and robots meta directives, robots.txt permissions for the homepage and images, and homepage responses using Googlebot, Bingbot, and OAI-SearchBot user agents.
- **Metadata:** deployed title, canonical, Open Graph fields, and favicon link match local source; JSON-LD parses and matches local data; basic MusicGroup fields, sitemap XML, and favicon SVG are valid; referenced image URLs respond as images.

A passing result does not certify the entire deployment. Source-exposure probes are representative, not exhaustive. User-agent probes do not originate from genuine crawler IPs and cannot prove CDN allowlist behavior. The script does not perform full Schema.org validation, decode raster images to verify their contents or dimensions, or visually render previews. Complete those manual checks separately. Redirect verification, Search Console setup, and search-performance review remain outside this script's scope.

## GitHub Actions

`.github/workflows/verify-deployment.yml` runs two separate jobs under **Verify site**:

- **Pull requests:** build the proposed revision with `node scripts/build-site.cjs`, serve `dist` on an ephemeral localhost port, and run the verifier against that build. This does not contact production or deploy anything.
- **Production:** run the verifier daily at 16:23 UTC (08:23 Pacific standard time / 09:23 Pacific daylight time), and on demand from **Actions → Verify site → Run workflow**. Production results are included in the run summary.

Both jobs use read-only repository permissions and require no secrets. Failed checks fail the job. Include the build script and verifier in any PR introducing the workflow; the workflow cannot run by itself.

Schedules and the manual-run UI become available once the workflow is on the default branch; schedules run that branch. A manual production run checks the branch selected in the Actions UI. Keep that revision aligned with the deployed site: unshipped changes will correctly report a mismatch. PR checks use the proposed revision instead.

Production checks do not run on pushes or pull requests because production may still be serving the previous release. Once a deployment pipeline exists, the verifier can also run after a successful production deployment. GitHub schedules can be delayed; this is a daily health check, not an uptime SLA. See [GitHub's workflow trigger documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
