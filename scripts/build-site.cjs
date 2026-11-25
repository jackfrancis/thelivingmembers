// Build the public Pages artifact without publishing repository source files.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const pages = ['index.html', '404.html'];
const html = pages.map(page => fs.readFileSync(path.join(root, page), 'utf8')).join('\n');
// Covers the image URLs in HTML attributes, srcsets, inline CSS, and JSON-LD.
const images = html.match(/images\/[A-Za-z0-9/_.-]+\.(?:png|webp|jpe?g|gif|svg)\b/g) || [];
const files = new Set([...pages, 'favicon.svg', 'robots.txt', 'sitemap.xml', ...images]);

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
console.log(`Built ${files.size} public files in dist/`);
