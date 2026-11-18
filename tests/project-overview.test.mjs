import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gallery = html.match(/<script id="gallery-script">([\s\S]*?)<\/script>/)[1];
const artPath = 'assets/executor-compare/background.png';
const allStyles = () => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');

function fixture({ complete = false, naturalWidth = 0 } = {}) {
  const image = {
    hidden: true, complete, naturalWidth, listeners: new Map(),
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    emit(name) { assert.ok(this.listeners.has(name), `missing ${name} handler`); this.listeners.get(name)(); },
  };
  const placeholder = { hidden: false };
  const elements = new Map([['#gallery-image', image], ['#gallery-placeholder', placeholder]]);
  runInNewContext(gallery + ';({ mountGallery })', { document: undefined })
    .mountGallery({ querySelector: selector => elements.get(selector) ?? null });
  return { image, placeholder };
}

test('project overview block is visible and states the collaboration project', () => {
  assert.equal([...html.matchAll(/\bid="project-info"/g)].length, 1);
  const section = html.match(/<section class="project-info" id="project-info"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(section);
  for (const text of ['山间专注 · 协作试验', '开发与美术协作 · 单项目工作台', 'V0.3 连续开发验证规范', '共享文档 revision 1', '保留计数器已有功能', '交付可追踪的代码与美术', '完成测试与本人验收']) {
    assert.ok(section[1].includes(text), text);
  }
  const styles = allStyles();
  assert.doesNotMatch(styles, /\.project-info[^{]*\{[^}]*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0(?:\s|;|}))/i);
});

test('art showcase points at the configured relative path with a CSS placeholder', () => {
  const section = html.match(/<section class="art-gallery"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(section);
  const image = section[1].match(/<img\b[^>]*>/)[0];
  assert.ok(image.includes(`src="${artPath}"`));
  assert.match(image, /alt=""/);
  assert.match(section[1], /id="gallery-placeholder"/);
  const styles = allStyles();
  assert.match(styles, /\.art-frame\s*\{[^}]*aspect-ratio:\s*16 \/ 9/);
  assert.match(styles, /\.art-frame\s*\{[^}]*background:\s*linear-gradient/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.art-gallery\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test('missing art keeps the placeholder and a late load swaps in the image', () => {
  const { image, placeholder } = fixture();
  assert.equal(image.hidden, true);
  assert.equal(placeholder.hidden, false);
  image.emit('error');
  assert.equal(image.hidden, true);
  image.naturalWidth = 1024;
  image.emit('load');
  assert.equal(image.hidden, false);
  assert.equal(placeholder.hidden, true);
  image.emit('error');
  assert.equal(image.hidden, true);
  assert.equal(placeholder.hidden, false);
});

test('cached art is shown without waiting for a load event', () => {
  const { image, placeholder } = fixture({ complete: true, naturalWidth: 1024 });
  assert.equal(image.hidden, false);
  assert.equal(placeholder.hidden, true);
  const broken = fixture({ complete: true, naturalWidth: 0 });
  assert.equal(broken.image.hidden, true);
  assert.equal(broken.placeholder.hidden, false);
});
