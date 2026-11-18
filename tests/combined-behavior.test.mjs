import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// Build the event surface from actual page IDs, then execute every delivered script
// in browser order. Missing controls or incompatible scripts fail initialization.
function openPage() {
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>([^<]*)/g)) {
    const [, , attributes, id, text] = match;
    const attrs = new Map([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const classes = new Set((attrs.get('class') ?? '').split(/\s+/));
    const listeners = new Map();
    elements.set('#' + id, {
      textContent: text, hidden: /\bhidden\b/.test(attributes), complete: false, naturalWidth: 0,
      setAttribute: (name, value) => attrs.set(name, value),
      getAttribute: name => attrs.get(name),
      classList: {
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
        contains: name => classes.has(name),
      },
      addEventListener(name, handler) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(handler);
      },
      emit(name) {
        assert.ok(listeners.has(name), `Missing ${name} handler on ${id}`);
        for (const handler of listeners.get(name)) handler();
      },
    });
  }
  const context = { document: { querySelector: selector => elements.get(selector) ?? null } };
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    runInNewContext(match[1], context);
  }
  return id => elements.get('#' + id);
}

test('all page scripts coexist through focus changes, image failure and repeated counter actions', () => {
  const get = openPage();
  const click = id => get(id).emit('click');
  const check = (count, operations, focused) => {
    assert.equal(get('count').textContent, String(count));
    assert.equal(get('operations').textContent, String(operations));
    assert.equal(get('workspace').classList.contains('is-focused'), focused);
    assert.equal(get('focus-toggle').getAttribute('aria-pressed'), String(focused));
    assert.equal(get('workspace-note').textContent, '先验证，再扩展');
    assert.equal(get('workspace-note').hidden, false);
    assert.equal(get('project-description').textContent, '连续开发验证项目');
  };
  check(0, 0, false);
  click('decrement');
  click('focus-toggle');
  get('mountain-image').emit('error');
  check(-1, 1, true);
  click('decrement');
  click('increment');
  check(-1, 3, true);
  click('reset');
  click('reset');
  check(0, 5, true);
  get('mountain-image').naturalWidth = 1672;
  get('mountain-image').emit('load');
  click('focus-toggle');
  assert.equal(get('mountain-image').hidden, false);
  assert.equal(get('image-placeholder').hidden, true);
  click('increment');
  check(1, 6, false);
  for (let i = 0; i < 10; i++) click('focus-toggle');
  check(1, 6, false);
  const reopened = openPage();
  assert.equal(reopened('count').textContent, '0');
  assert.equal(reopened('operations').textContent, '0');
  check(1, 6, false);
});

test('both fixed input versions and shared snapshot versions remain traceable', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const sha of ['e4250d3235dc51da67f74ec46176d53bcf7cd290', '5453e51012149ef052da3bc53109b5d65556ca29']) {
    assert.ok(readme.includes(sha));
  }
  assert.match(readme, /共享文档固定快照：revision 1/);
  // Pin exact UTF-8 bytes, including the original trailing newline.
  const doc = readFileSync(new URL('../docs/workspace-v05.md', import.meta.url));
  assert.equal(doc.toString('utf8').endsWith('\n'), true);
  assert.equal(doc.includes(Buffer.from('\r')), false);
});


test('A and B selected notes survive add-ten, focus changes and image recovery together', () => {
  const get = openPage();
  const click = id => get(id).emit('click');
  const verify = (count, operations, focused) => {
    assert.equal(get('count').textContent, String(count));
    assert.equal(get('operations').textContent, String(operations));
    assert.equal(get('workspace').classList.contains('is-focused'), focused);
    assert.equal(get('focus-toggle').getAttribute('aria-pressed'), String(focused));
    for (const [id, text] of [['workflow-status', '先记录，再推进'], ['workspace-note', '先验证，再扩展'], ['project-description', '连续开发验证项目']]) {
      assert.equal(get(id).textContent, text);
      assert.equal(get(id).hidden, false);
    }
  };
  verify(0, 0, false);
  click('decrement');
  click('addTen');
  verify(9, 2, false);
  click('focus-toggle');
  get('mountain-image').emit('error');
  assert.equal(get('mountain-image').hidden, true);
  assert.equal(get('image-placeholder').hidden, false);
  click('addTen');
  click('increment');
  click('decrement');
  verify(19, 5, true);
  click('reset');
  click('reset');
  verify(0, 7, true);
  get('mountain-image').naturalWidth = 1672;
  get('mountain-image').emit('load');
  click('focus-toggle');
  assert.equal(get('mountain-image').hidden, false);
  assert.equal(get('image-placeholder').hidden, true);
  click('addTen');
  verify(10, 8, false);
  const fresh = openPage();
  assert.equal(fresh('count').textContent, '0');
  assert.equal(fresh('operations').textContent, '0');
  assert.equal(fresh('focus-toggle').getAttribute('aria-pressed'), 'false');
  verify(10, 8, false);
});
