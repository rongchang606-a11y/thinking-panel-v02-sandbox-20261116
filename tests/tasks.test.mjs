import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const coreSource = html.match(/<script id="task-core">([\s\S]*?)<\/script>/)[1];
const appSource = html.match(/<script id="task-app">([\s\S]*?)<\/script>/)[1];
function memory(initial = null) {
  return { raw: initial, fail: false, getItem() { return this.raw; }, setItem(key, value) { if (this.fail) throw Error('quota'); this.raw = value; } };
}
function core() { const scope = vm.createContext({}); vm.runInContext(coreSource, scope); return scope.TaskCore; }
const plain = value => JSON.parse(JSON.stringify(value));

test('single-file page uses only inline scripts with core loaded before app', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.equal(scripts.length, 2, 'The page must contain exactly the two inline scripts');
  for (const [, attributes, body] of scripts) {
    assert.doesNotMatch(attributes, /\bsrc\s*=/i, 'Single-file page must not request external scripts');
    assert.ok(body.trim(), 'Inline script must not be empty');
  }
  assert.match(scripts[0][1], /\bid="task-core"/);
  assert.match(scripts[1][1], /\bid="task-app"/);
});

test('add, edit, toggle both ways and delete without mutating previous state', () => {
  const c = core();
  const first = c.change([], { type: 'add', id: 'one', title: '  阅读  ' });
  const second = c.change(first, { type: 'add', id: 'two', title: '散步' });
  const edited = c.change(second, { type: 'edit', id: 'one', title: '写笔记' });
  const done = c.change(edited, { type: 'toggle', id: 'one' });
  assert.equal(first[0].title, '阅读');
  assert.equal(done[0].completed, true);
  assert.equal(c.change(done, { type: 'toggle', id: 'one' })[0].completed, false);
  assert.deepEqual(plain(c.change(done, { type: 'delete', id: 'one' })), [{ id: 'two', title: '散步', completed: false }]);
});

test('reject blank, oversized titles, duplicate ids and missing tasks', () => {
  const c = core();
  for (const title of ['', '   ', 'x'.repeat(201), null]) assert.throws(() => c.change([], { type: 'add', id: 'a', title }));
  const tasks = c.change([], { type: 'add', id: 'a', title: 'x'.repeat(200) });
  assert.throws(() => c.change(tasks, { type: 'add', id: 'a', title: 'duplicate' }));
  assert.throws(() => c.change(tasks, { type: 'edit', id: 'a', title: ' ' }));
  assert.throws(() => c.change(tasks, { type: 'delete', id: 'missing' }));
});

test('persist and reload tasks; reject corrupt or malformed stored data', () => {
  const c = core(), storage = memory();
  assert.deepEqual(plain(c.load(storage)), []);
  c.save(storage, [{ id: 'a', title: '中文任务', completed: true }]);
  assert.deepEqual(plain(core().load(storage)), [{ id: 'a', title: '中文任务', completed: true }]);
  for (const raw of ['{', '{}', '[null]', '[{"id":"a","title":"ok","completed":"false"}]', '[{"id":"a","title":"ok","completed":false},{"id":"a","title":"ok","completed":true}]']) {
    const bad = memory(raw);
    assert.throws(() => c.load(bad));
    assert.equal(bad.raw, raw);
  }
});

// Minimal DOM adapter: executes the actual application event handlers without dependencies.
class Element {
  constructor(tag = '') { this.tag = tag; this.children = []; this.events = {}; this.value = ''; this.textContent = ''; this.hidden = false; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, callback) { this.events[type] = callback; }
  setAttribute(key, value) { this[key] = value; }
  focus() { this.focused = true; }
  fire(type, extra = {}) { this.events[type]?.({ preventDefault() {}, ...extra }); }
}
function boot(storage) {
  const ids = ['task-form', 'task-title', 'task-list', 'status', 'cancel-edit', 'submit-task', 'form-label', 'empty', 'summary'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const document = { getElementById(id) { return elements[id] || elements['task-list'].children.flatMap(row => row.children).find(el => el.id === id); }, createElement: tag => new Element(tag) };
  let sequence = 0;
  const scope = vm.createContext({ document, window: { localStorage: storage, crypto: { randomUUID: () => String(++sequence) } } });
  vm.runInContext(coreSource, scope); vm.runInContext(appSource, scope);
  return { ...elements, submit(title) { elements['task-title'].value = title; elements['task-form'].fire('submit'); }, rows: () => elements['task-list'].children };
}

test('page handlers support all four operations and restore state on reload', () => {
  const storage = memory(), app = boot(storage);
  app.submit('<img src=x onerror=alert(1)>');
  assert.equal(app.rows().length, 1);
  assert.equal(app.rows()[0].children[1].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(app.rows()[0].children[1].children.length, 0);
  app.rows()[0].children[2].children[0].fire('click');
  app.submit('修改后的任务');
  assert.equal(app.rows()[0].children[1].textContent, '修改后的任务');
  app.rows()[0].children[0].fire('change');
  const restored = boot(storage);
  assert.equal(restored.rows()[0].children[0].checked, true);
  assert.equal(restored.rows()[0].children[1].textContent, '修改后的任务');
  restored.rows()[0].children[0].fire('change');
  assert.equal(restored.rows()[0].children[0].checked, false);
  restored.rows()[0].children[2].children[1].fire('click');
  assert.equal(restored.rows().length, 0);
  assert.equal(boot(storage).rows().length, 0);
});

test('cancel edit and Escape preserve original task', () => {
  const app = boot(memory()); app.submit('原任务');
  for (const cancel of [() => app['cancel-edit'].fire('click'), () => app['task-title'].fire('keydown', { key: 'Escape' })]) {
    app.rows()[0].children[2].children[0].fire('click');
    app['task-title'].value = '未保存'; cancel();
    assert.equal(app['task-title'].value, '');
    assert.equal(app['cancel-edit'].hidden, true);
    assert.equal(app.rows()[0].children[1].textContent, '原任务');
  }
});

test('storage write failure keeps persisted and visible state, including checkbox rollback', () => {
  const storage = memory(), app = boot(storage); app.submit('原任务');
  const saved = storage.raw; storage.fail = true;
  app.submit('保存不了'); assert.equal(app.rows().length, 1);
  assert.equal(app['task-title'].value, '保存不了');
  app.rows()[0].children[2].children[0].fire('click'); app.submit('改不了');
  assert.equal(app.rows()[0].children[1].textContent, '原任务');
  const check = app.rows()[0].children[0]; check.checked = true; check.fire('change');
  assert.equal(check.checked, false);
  app.rows()[0].children[2].children[1].fire('click');
  assert.equal(app.rows().length, 1); assert.equal(storage.raw, saved);
  assert.match(app.status.textContent, /保存失败/);
  storage.fail = false; app.submit('重试成功');
  assert.equal(app.rows()[0].children[1].textContent, '重试成功');
});

test('unreadable storage disables writes and preserves original bytes', () => {
  const storage = memory('{broken'), app = boot(storage);
  assert.equal(app['task-title'].disabled, true);
  assert.match(app.status.textContent, /无法读取/);
  app.submit('不得覆盖'); assert.equal(storage.raw, '{broken');
  const blocked = boot({ getItem() { throw Error('denied'); } });
  assert.equal(blocked['submit-task'].disabled, true);
});
