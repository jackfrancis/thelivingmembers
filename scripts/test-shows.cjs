const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const { glyphs } = require('../images/typecabinet/manifest.json');

function readLettering(html) {
  const words = html.matchAll(/<span class="word\b[^"]*">([\s\S]*?)<\/span>/g);
  return Array.from(words, ([, word]) => {
    const letters = word.matchAll(/src="images\/typecabinet\/128\/([^"]+)\.png"/g);
    return Array.from(letters, ([, key]) => glyphs[key].character).join('');
  }).join(' ');
}

test('the static announcement and calendar follow edits to the show record', t => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'living-members-shows-'));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  for (const file of ['index.html', '404.html', 'images', 'favicon.svg', 'sitemap.xml', 'robots.txt']) {
    fs.symlinkSync(path.join(root, file), path.join(site, file));
  }
  fs.cpSync(__dirname, path.join(site, 'scripts'), { recursive: true });

  const show = {
    id: 'release-show',
    leadIn: 'Come grab our debut vinyl LP at',
  };
  const cases = [
    {
      venue: 'Arbor Beer Lodge', startsAt: '2026-12-19T20:00:00-08:00', admission: 'five dollar cover',
      dateWords: 'Saturday December 19th', utcStart: '20261220T040000Z',
    },
    {
      venue: 'The Park', startsAt: '2027-07-02T20:00:00-07:00', admission: 'free admission',
      dateWords: 'Friday July 2nd', utcStart: '20270703T030000Z',
    },
  ];
  for (const { dateWords, utcStart, ...details } of cases) {
    fs.writeFileSync(path.join(site, 'shows.json'), JSON.stringify([{ ...show, ...details }]));
    execFileSync(process.execPath, ['scripts/build-site.cjs'], { cwd: site });

    const page = fs.readFileSync(path.join(site, 'dist/index.html'), 'utf8');
    const description = `${show.leadIn} ${details.venue} on ${dateWords}. 8 p.m. ${details.admission}.`;
    const links = [...page.matchAll(/(<a\b[^>]*\bhref="shows\/release-show\.ics"[^>]*>)([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, 1, 'one calendar link for the show');
    const [link, openingTag, contents] = links[0];
    assert.doesNotMatch(openingTag, /\sdownload(?:[\s=>])/i, 'allow the browser to preview the calendar event');
    assert.ok(contents.includes(`<span class="sr-only">${description} Add to calendar.</span>`),
      'the link speaks the full announcement and the action');
    assert.equal(readLettering(contents), description.toUpperCase(), 'the illustrated announcement is the link');
    assert.ok(!readLettering(page.replace(link, '')).includes('ADD TO CALENDAR'), 'no separate illustrated calendar label');

    const calendar = fs.readFileSync(path.join(site, 'dist/shows/release-show.ics'), 'utf8');
    const lines = calendar.replaceAll('\r\n ', '').split('\r\n');
    for (const field of [
      'UID:release-show@thelivingmembers.com', `DTSTART:${utcStart}`,
      `LOCATION:${details.venue}`, `SUMMARY:The Living Members at ${details.venue}`,
      `DESCRIPTION:${description}`,
    ]) {
      assert.ok(lines.includes(field), field);
    }
    assert.ok(!lines.some(line => line.startsWith('DTEND:')), 'no invented end time');
  }
});
