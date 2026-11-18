import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const focus = html.match(/<script id="focus-script">([\s\S]*?)<\/script>/)[1];
const css = html.match(/<style id="focus-styles">([\s\S]*?)<\/style>/)[1];
const counter = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function fixture({ complete = false, naturalWidth = 0 } = {}) {
  const elements = new Map();
  for (const id of ['workspace', 'focus-toggle', 'mountain-image', 'image-placeholder', 'count', 'operations', 'counter-summary', 'increment', 'addTen', 'decrement', 'reset']) {
    const classes = new Set();
    const handlers = new Map();
    elements.set('#' + id, {
      textContent: '', hidden: id === 'mountain-image', complete, naturalWidth,
      attributes: { 'aria-pressed': 'false' },
      setAttribute(name, value) { this.attributes[name] = value; },
      classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); }, contains(name) { return classes.has(name); } },
      addEventListener(name, handler) { handlers.set(name, handler); },
      emit(name) { assert.ok(handlers.has(name)); handlers.get(name)(); },
    });
  }
  const document = { querySelector: selector => elements.get(selector) };
  const context = { document };
  runInNewContext(counter, context);
  runInNewContext(focus, context);
  return id => elements.get('#' + id);
}

test('focus mode toggles on and off with accessible state and original layout restored', () => {
  const get = fixture();
  const button = get('focus-toggle');
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(get('workspace').classList.contains('is-focused'), false);
  button.emit('click');
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(get('workspace').classList.contains('is-focused'), true);
  assert.equal(button.textContent, '恢复普通布局');
  button.emit('click');
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(get('workspace').classList.contains('is-focused'), false);
  assert.equal(button.textContent, '专注模式');
});

test('switching layouts preserves values, operations and all original actions', () => {
  const get = fixture();
  get('decrement').emit('click');
  get('focus-toggle').emit('click');
  assert.equal(get('count').textContent, '-1');
  assert.equal(get('operations').textContent, '1');
  get('increment').emit('click');
  get('reset').emit('click');
  get('reset').emit('click');
  get('focus-toggle').emit('click');
  assert.equal(get('count').textContent, '0');
  assert.equal(get('operations').textContent, '4');
  get('increment').emit('click');
  assert.equal(get('count').textContent, '1');
  assert.equal(get('operations').textContent, '5');
});

test('image contract uses the relative integration asset with safe CSS placeholder', () => {
  assert.match(html, /<img[^>]*src="assets\/v04\/background.png"[^>]*alt=""[^>]*hidden>/);
  assert.match(html, /id="image-placeholder"/);
  assert.match(css, /background: linear-gradient/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(html, /id="focus-toggle"[^>]*type="button"[^>]*aria-pressed="false"/);
  assert.doesNotMatch(focus, /\b(?:import|export)\s/);
  const get = fixture();
  assert.equal(get('mountain-image').hidden, true);
  assert.equal(get('image-placeholder').hidden, false);
  get('mountain-image').emit('error');
  get('increment').emit('click');
  assert.equal(get('count').textContent, '1');
  assert.equal(get('image-placeholder').hidden, false);
});

test('late image load replaces placeholder and a failed reload restores it', () => {
  const get = fixture();
  const image = get('mountain-image');
  image.naturalWidth = 1600;
  image.emit('load');
  assert.equal(image.hidden, false);
  assert.equal(get('image-placeholder').hidden, true);
  image.emit('error');
  assert.equal(image.hidden, true);
  assert.equal(get('image-placeholder').hidden, false);
  get('focus-toggle').emit('click');
  get('focus-toggle').emit('click');
  assert.equal(get('image-placeholder').hidden, false);
});

test('cached images are recognized even if load fired before initialization', () => {
  const get = fixture({ complete: true, naturalWidth: 1600 });
  assert.equal(get('mountain-image').hidden, false);
  assert.equal(get('image-placeholder').hidden, true);
  const broken = fixture({ complete: true, naturalWidth: 0 });
  assert.equal(broken('mountain-image').hidden, true);
  assert.equal(broken('image-placeholder').hidden, false);
});
