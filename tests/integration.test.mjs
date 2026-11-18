import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
// Pin the accepted inputs so this suite also runs without the controller's private task snapshot.
const inputs = {
  development: 'de9c58feb999a69c467df90d950fd3ca3fa51707',
  art: '6f88df3a87c5de699c562c595ee782a70576b606',
  artSha256: '3fc0f71b59f52bf3c4d8c6e7417f69a49e130c2dfb97cf67b6cceae8fdf42da4',
};
const png = readFileSync(new URL('assets/v04/background.png', root));
const manifest = JSON.parse(readFileSync(new URL('assets/v04/manifest.json', root), 'utf8'));

test('integrated PNG is byte-identical to the trusted art input and matches manifest dimensions', () => {
  assert.equal(createHash('sha256').update(png).digest('hex'), inputs.artSha256);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), manifest.width);
  assert.equal(png.readUInt32BE(20), manifest.height);
  assert.ok(manifest.width >= 640 && manifest.height >= 360);
  assert.ok(manifest.width > manifest.height);
  assert.equal(manifest.asset, 'assets/v04/background.png');
  // Verify the image contains a complete, decompressible pixel stream, not just a PNG header.
  const data = [];
  let ended = false;
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    assert.ok(offset + length + 12 <= png.length);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') data.push(png.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') ended = true;
    offset += length + 12;
  }
  assert.ok(ended);
  assert.ok(inflateSync(Buffer.concat(data)).length > manifest.width * manifest.height);
});

test('mountain image resolves locally and intrinsic size agrees with the supplied PNG', () => {
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  const mountain = images.find(image => /id="mountain-image"/.test(image));
  assert.ok(mountain);
  const source = mountain.match(/src="([^"]+)"/)[1];
  assert.equal(source, manifest.asset);
  assert.ok(existsSync(new URL(source, root)));
  assert.match(mountain, new RegExp(`width="${manifest.width}"`));
  assert.match(mountain, new RegExp(`height="${manifest.height}"`));
  assert.match(mountain, /alt=""/);
});

test('collaboration art references the task art path relatively and tolerates a missing file', () => {
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.equal(images.length, 2);
  const gallery = images.find(image => /id="gallery-image"/.test(image));
  assert.ok(gallery);
  const source = gallery.match(/src="([^"]+)"/)[1];
  assert.equal(source, 'assets/executor-compare/background.png');
  assert.doesNotMatch(source, /^(?:[a-z]+:)?\/\//i);
  assert.equal(source.startsWith('/'), false);
  assert.match(gallery, /alt=""/);
  // The art role owns this file; development only points at it. Absence must stay non-fatal.
  if (existsSync(new URL(source, root))) {
    assert.ok(readFileSync(new URL(source, root)).length > 0);
  }
});

test('portrait and short landscape layout contracts keep controls outside the decorative image', () => {
  const css = html.match(/<style id="focus-styles">([\s\S]*?)<\/style>/)[1];
  assert.match(html, /<\/section>\s*<main class="counter"/);
  assert.match(css, /\.mountain img\s*\{[^}]*pointer-events: none;[^}]*z-index: -2;/);
  assert.match(css, /object-position: center bottom/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?aspect-ratio: 1672 \/ 941/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 600px\)[\s\S]*?align-items: start/);
  assert.match(html, /button:focus-visible\s*\{[^}]*outline: 3px/);
  for (const id of ['increment', 'decrement', 'reset', 'focus-toggle']) {
    const button = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>[^<]+<\\/button>`))[0];
    assert.match(button, /type="button"/);
    assert.doesNotMatch(button, /\b(?:disabled|hidden|tabindex="-1")\b/);
  }
});

test('README records both exact integration inputs and the immutable asset path', () => {
  const readme = readFileSync(new URL('README.md', root), 'utf8');
  for (const input of [inputs.development, inputs.art, inputs.artSha256, manifest.asset]) {
    assert.ok(readme.includes(input), `Missing provenance: ${input}`);
  }
});
