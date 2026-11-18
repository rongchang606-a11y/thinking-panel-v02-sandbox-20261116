import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

// Public delivery inputs are pinned here: tests do not depend on private .panel files.
const artPath = 'assets/executor-compare/background.png';
const inputs = {
  development: '494d299d5f433982bd7fec3d91454377012ffb72',
  art: '855d1d143b03fad01496fb8d54c9fae24cb11d12',
  artSha256: '03d3dbbbc64e401e02b56f8f83870403e5727e86f681d0f026050a28ce5106b4',
};
const read = path => readFileSync(new URL('../' + path, import.meta.url));
const html = read('index.html').toString('utf8');
const png = read(artPath);
const manifest = JSON.parse(read('assets/executor-compare/manifest.json'));

test('custom PNG matches the trusted input and contains complete valid pixel rows', () => {
  assert.equal(createHash('sha256').update(png).digest('hex'), inputs.artSha256);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(width, manifest.width);
  assert.equal(height, manifest.height);
  assert.ok(width >= 1024 && height >= 576);
  assert.ok(Math.abs(width / height - 16 / 9) < 0.01);
  assert.equal(png[24], 8, '8-bit channels');
  assert.ok([2, 6].includes(png[25]), 'RGB or RGBA pixels');
  assert.equal(png[28], 0, 'non-interlaced scanlines');
  const parts = [];
  let ended = false;
  for (let offset = 8; offset < png.length;) {
    assert.ok(offset + 12 <= png.length);
    const length = png.readUInt32BE(offset);
    assert.ok(offset + length + 12 <= png.length);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') parts.push(png.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') {
      assert.equal(length, 0);
      assert.equal(offset + 12, png.length);
      ended = true;
    }
    offset += length + 12;
  }
  assert.ok(ended);
  const rowSize = width * (png[25] === 6 ? 4 : 3) + 1;
  const pixels = inflateSync(Buffer.concat(parts));
  assert.equal(pixels.length, rowSize * height);
  for (let row = 0; row < height; row++) assert.ok(pixels[row * rowSize] <= 4);
});

test('custom art metadata, page dimensions and responsive frame agree', () => {
  assert.equal(manifest.artPath, artPath);
  assert.equal(manifest.format, 'PNG');
  assert.ok(manifest.tool && manifest.prompt);
  assert.ok(Number.isFinite(Date.parse(manifest.generatedAt)));
  const image = html.match(/<img\b[^>]*id="project-art"[^>]*>/)[0];
  assert.equal(image.match(/src="([^"]+)"/)[1], artPath);
  assert.ok(image.includes(`width="${manifest.width}"`));
  assert.ok(image.includes(`height="${manifest.height}"`));
  assert.match(image, /alt=""/);
  const css = html.match(/<style id="project-brief-styles">([\s\S]*?)<\/style>/)[1];
  assert.ok(css.includes(`aspect-ratio: ${manifest.width} / ${manifest.height}`));
  assert.match(css, /\.project-art\s*\{[^}]*min-width: 0;[^}]*width: 100%;/);
  assert.match(css, /\.project-art img\s*\{[^}]*pointer-events: none;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  for (const id of ['increment', 'decrement', 'addTen', 'reset', 'focus-toggle']) {
    const button = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))[0];
    assert.match(button, /type="button"/);
    assert.doesNotMatch(button, /\b(?:hidden|disabled)\b|tabindex="-1"/);
  }
});

test('delivery documentation records the current custom art and exact input versions', () => {
  const readme = read('README.md').toString('utf8');
  for (const input of [artPath, ...Object.values(inputs)]) assert.ok(readme.includes(input), input);
});
