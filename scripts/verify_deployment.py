#!/usr/bin/env python3
"""Check this site's deployed files, crawlability, and metadata (Python stdlib only)."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BOTS = ('Googlebot', 'Bingbot', 'OAI-SearchBot')


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.meta, self.links, self.assets, self.blocks = {}, {}, set(), []
        self.title = ''
        self.in_title = self.in_json = False
        self.feed(text)
        self.assets.update(re.findall(r'url\([\"\']?([^\)\"\']+)', text))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_json = True
            self.blocks.append('')
        if tag == 'meta': self.meta[a.get('property', a.get('name', '')).lower()] = a.get('content', '')
        if tag == 'link': self.links[a.get('rel', '')] = a.get('href', '')
        if tag in ('img', 'source'):
            if a.get('src'): self.assets.add(a['src'])
            for entry in a.get('srcset', '').split(','):
                if entry.strip(): self.assets.add(entry.strip().split()[0])

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script': self.in_json = False

    def handle_data(self, text):
        if self.in_title: self.title += text
        if self.in_json: self.blocks[-1] += text


def blocked(value):
    return bool(re.search(r'\b(noindex|none|nosnippet)\b|max-snippet\s*:\s*0\b', value, re.I))


class Audit:
    def __init__(self, base, timeout):
        self.base, self.timeout, self.failures = base.rstrip('/') + '/', timeout, 0
        self.cache = {}

    def check(self, condition, label):
        print(('PASS' if condition else 'FAIL') + ' ' + label)
        self.failures += not condition
        return condition

    def get(self, path, agent='DeploymentVerifier/1.0', required=True):
        url = urljoin(self.base, path)
        key = (url, agent)
        if key in self.cache: return self.cache[key]
        try:
            with urlopen(Request(url, headers={'User-Agent': agent}), timeout=self.timeout) as r:
                result = (r.status, r.headers, r.read(), r.url)
        except HTTPError as e:
            result = (e.code, e.headers, e.read(), e.url)
        except (URLError, TimeoutError, OSError) as e:
            if required: self.check(False, f'{url}: {e}')
            return None
        self.cache[key] = result
        if required:
            self.check(result[0] == 200, f'{agent}: {url} returns 200 (got {result[0]})')
            self.check(not blocked(' '.join(result[1].get_all('X-Robots-Tag', []))), f'{url}: no restrictive X-Robots-Tag')
            if self.base.startswith('https:'):
                self.check(result[3].startswith('https:'), f'{url}: stays on HTTPS')
        return result

    def run(self):
        expected = Page((ROOT / 'index.html').read_text())
        canonical = expected.links.get('canonical')
        self.check(bool(canonical) and canonical.startswith('https://'), 'local canonical is HTTPS')
        response = self.get('')
        if not response or response[0] != 200: return
        self.check(response[1].get_content_type() == 'text/html', 'homepage is HTML')
        page = Page(response[2].decode('utf-8', errors='replace'))
        self.check(page.title == expected.title and bool(page.title.strip()), 'deployed title matches local title')
        self.check(page.links.get('canonical') == canonical, 'deployed canonical matches local canonical')
        for key in ('description', 'og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt'):
            self.check(bool(page.meta.get(key)) and page.meta.get(key) == expected.meta.get(key), f'{key} matches local metadata')
        for key, value in page.meta.items():
            if key in ('robots', 'googlebot', 'bingbot', 'oai-searchbot'):
                self.check(not blocked(value), f'{key} meta permits indexing and snippets')
        self.check(page.links.get('icon') == expected.links.get('icon') and bool(page.links.get('icon')), 'favicon link matches local source')
        try:
            actual = [json.loads(b) for b in page.blocks]
            wanted = [json.loads(b) for b in expected.blocks]
            self.check(bool(actual) and actual == wanted, 'JSON-LD parses and matches local source')
            groups = [x for x in actual if isinstance(x, dict) and x.get('@type') == 'MusicGroup']
            self.check(len(groups) == 1, 'one MusicGroup object')
            for group in groups:
                self.check(group.get('@context') == 'https://schema.org' and bool(group.get('name')) and group.get('url') == canonical, 'MusicGroup context, name, and URL')
                if group.get('image'): page.assets.add(group['image'])
        except (ValueError, TypeError) as e:
            self.check(False, f'JSON-LD: {e}')
        robot_response = self.get('robots.txt')
        robots = RobotFileParser()
        if robot_response:
            self.check(robot_response[1].get_content_type() == 'text/plain', 'robots.txt content type')
            robots.parse(robot_response[2].decode('utf-8', errors='replace').splitlines())
            self.check(urljoin(canonical or '', 'sitemap.xml') in (robots.site_maps() or []), 'robots advertises canonical sitemap')
        sitemap = self.get('sitemap.xml')
        if sitemap:
            self.check(sitemap[1].get_content_type() in ('application/xml', 'text/xml'), 'sitemap content type')
            try:
                tree = ET.fromstring(sitemap[2])
                locations = [x.text for x in tree.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
                self.check(canonical in locations, 'sitemap contains canonical homepage')
            except ET.ParseError as e: self.check(False, f'sitemap XML: {e}')
        page.assets.update(filter(None, (page.meta.get('og:image'), page.links.get('icon'))))
        paths = set()
        for asset in page.assets:
            absolute = urljoin(canonical or self.base, asset)
            if urlsplit(absolute).netloc == urlsplit(canonical or self.base).netloc:
                path = urlsplit(absolute).path
                paths.add(path)
                result = self.get(path)
                if result:
                    mime = result[1].get_content_type()
                    self.check(mime.startswith('image/'), f'{path}: image content type')
                    if path.endswith('.svg'):
                        self.check(mime == 'image/svg+xml', f'{path}: SVG content type')
                        try:
                            self.check(ET.fromstring(result[2]).tag == '{http://www.w3.org/2000/svg}svg', f'{path}: valid SVG')
                        except ET.ParseError: self.check(False, f'{path}: invalid SVG')
            else:
                self.check(False, f'asset outside canonical origin requires review: {absolute}')
        for bot in BOTS:
            for path in paths | {'/'}:
                self.check(robots.can_fetch(bot, urljoin(self.base, path)), f'robots allows {bot} {path}')
            result = self.get('', agent=bot)
            if result:
                self.check(result[2] == response[2], f'{bot}: homepage matches normal response (no detected challenge)')
        missing = self.get('deployment-check/missing-page', required=False)
        self.check(missing is not None and missing[0] == 404,
                   'unknown nested URL returns HTTP 404')
        exclusions = ['README.md', 'scripts/verify_deployment.py', 'scripts/build-site.cjs'] + [p.relative_to(ROOT).as_posix() for p in ROOT.glob('images/**/package.json')]
        for path in exclusions:
            result = self.get(path, required=False)
            self.check(result is not None and result[0] in (403, 404, 410),
                       f'{path}: source file not publicly served')
        print('MANUAL: CDN rules and access from genuine crawler IPs cannot be proven by user-agent probes.')
        print('MANUAL: Run Schema.org validation; visually review share-image quality and favicon. This checks metadata and responses, not full schema semantics or browser rendering.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='https://thelivingmembers.com/', help='Deployment origin; localhost HTTP is allowed for preview testing')
    parser.add_argument('--timeout', type=float, default=15, help='Per-request timeout in seconds')
    args = parser.parse_args()
    url = urlsplit(args.base_url)
    if url.scheme not in ('http', 'https') or not url.netloc or url.path not in ('', '/') or url.query or url.fragment:
        parser.error('--base-url must be an HTTP(S) origin without a path, query, or fragment')
    if url.scheme != 'https' and url.hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('HTTPS is required except for loopback previews')
    if args.timeout <= 0: parser.error('--timeout must be positive')
    audit = Audit(args.base_url, args.timeout)
    audit.run()
    print(f'\n{audit.failures} failed checks. Manual checks remain even when all automated checks pass.')
    return 1 if audit.failures else 0


if __name__ == '__main__':
    sys.exit(main())
