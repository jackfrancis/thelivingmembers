// Build the public Pages artifact without publishing repository source files.
const fs = require('node:fs');
const path = require('node:path');
const { renderShows } = require('./render-shows.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const marker = '    <!-- Show announcements -->';
if (!template.includes(marker)) throw new Error('Missing show announcements marker in index.html');
const shows = renderShows(JSON.parse(fs.readFileSync(path.join(root, 'shows.json'), 'utf8')));
const homepage = template.replace(marker, () => shows.html);
const html = homepage + '\n' + fs.readFileSync(path.join(root, '404.html'), 'utf8');
// Covers the image URLs in HTML attributes, srcsets, inline CSS, and JSON-LD.
const images = html.match(/images\/[A-Za-z0-9/_.-]+\.(?:png|webp|jpe?g|gif|svg)\b/g) || [];
const files = new Set(['404.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', ...images]);

// Validate inputs before replacing the generated directory.
for (const file of files) {
  const source = path.resolve(root, file);
  if (!source.startsWith(root + path.sep) || !fs.statSync(source).isFile()) {
    throw new Error(`Invalid public asset: ${file}`);
  }
}
fs.rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}
fs.writeFileSync(path.join(output, 'index.html'), homepage);
for (const [file, contents] of shows.calendars) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}
console.log(`Built ${files.size + 1 + shows.calendars.size} public files in dist/`);
