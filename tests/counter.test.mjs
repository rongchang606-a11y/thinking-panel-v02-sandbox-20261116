import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const { createCounter, mountCounter } = await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`);

test('starts at zero and increments repeatedly', () => {
  const counter = createCounter();
  assert.equal(counter.value, 0);
  assert.equal(counter.increment(), 1);
  assert.equal(counter.increment(), 2);
  assert.equal(counter.value, 2);
});

test('decrements through zero to negative values', () => {
  const counter = createCounter();
  assert.equal(counter.decrement(), -1);
  assert.equal(counter.decrement(), -2);
  assert.equal(counter.increment(), -1);
});

test('adding ten changes the current value by ten and counts one operation per call', () => {
  const counter = createCounter();
  assert.equal(counter.addTen(), 10);
  assert.equal(counter.value, 10);
  assert.equal(counter.operations, 1);
  assert.equal(counter.addTen(), 20);
  assert.equal(counter.operations, 2);
  counter.reset();
  counter.decrement();
  assert.equal(counter.addTen(), 9);
  assert.equal(counter.value, 9);
  assert.equal(counter.operations, 5);
  assert.equal(counter.increment(), 10);
  assert.equal(counter.decrement(), 9);
  assert.equal(counter.reset(), 0);
  assert.equal(counter.operations, 8);
});

test('reset returns positive and negative counts to zero', () => {
  const counter = createCounter();
  counter.increment();
  assert.equal(counter.reset(), 0);
  counter.decrement();
  assert.equal(counter.reset(), 0);
  assert.equal(counter.reset(), 0);
  assert.equal(counter.increment(), 1);
});

test('counter instances have independent state', () => {
  const first = createCounter();
  const second = createCounter();
  first.increment();
  assert.equal(second.value, 0);
  assert.equal(first.operations, 1);
  assert.equal(second.operations, 0);
});

test('each action counts once, including repeated resets at zero', () => {
  const counter = createCounter();
  assert.equal(counter.operations, 0);
  counter.reset();
  assert.equal(counter.value, 0);
  assert.equal(counter.operations, 1);
  counter.reset();
  assert.equal(counter.operations, 2);
  counter.increment();
  assert.equal(counter.operations, 3);
  counter.decrement();
  assert.equal(counter.value, 0);
  assert.equal(counter.operations, 4);
  counter.decrement();
  assert.equal(counter.value, -1);
  assert.equal(counter.operations, 5);
  counter.reset();
  assert.equal(counter.value, 0);
  assert.equal(counter.operations, 6);
  assert.equal(createCounter().operations, 0);
});

test('all button handlers update the displayed count', () => {
  const elements = new Map();
  for (const id of ['count', 'operations', 'increment', 'addTen', 'decrement', 'reset']) {
    elements.set(`#${id}`, {
      textContent: '',
      addEventListener(type, handler) {
        assert.equal(type, 'click');
        this.click = handler;
      },
    });
  }
  mountCounter({ querySelector: selector => elements.get(selector) });
  const displayed = () => elements.get('#count').textContent;
  const operations = () => elements.get('#operations').textContent;
  const click = id => elements.get(`#${id}`).click();
  assert.equal(displayed(), '0');
  assert.equal(operations(), '0');
  click('increment');
  click('increment');
  assert.equal(displayed(), '2');
  assert.equal(operations(), '2');
  click('decrement');
  assert.equal(displayed(), '1');
  assert.equal(operations(), '3');
  click('reset');
  assert.equal(displayed(), '0');
  assert.equal(operations(), '4');
  click('decrement');
  assert.equal(displayed(), '-1');
  assert.equal(operations(), '5');
  click('reset');
  assert.equal(displayed(), '0');
  assert.equal(operations(), '6');
  click('reset');
  assert.equal(displayed(), '0');
  assert.equal(operations(), '7');
  click('decrement');
  click('addTen');
  assert.equal(displayed(), '9');
  assert.equal(operations(), '9');
  click('addTen');
  assert.equal(displayed(), '19');
  assert.equal(operations(), '10');
  click('increment');
  click('reset');
  assert.equal(displayed(), '0');
  assert.equal(operations(), '12');
});

test('project description is visible directly below the title and retains the original description', () => {
  assert.match(html, /<h1 id="title">计数器<\/h1>\s*<p class="description" id="project-description">连续开发验证项目<\/p>\s*<p class="description">从零开始，记录你的每一次变化。<\/p>/);
  const description = html.match(/<p\b[^>]*id="project-description"[^>]*>/)[0];
  assert.doesNotMatch(description, /\b(?:hidden|style|aria-hidden)\s*(?:=|>)/i);
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(styles, /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\s|;|}))/i);
});

test('page provides accessible controls and self-contained styles and logic', () => {
  for (const id of ['increment', 'addTen', 'decrement', 'reset']) {
    assert.match(html, new RegExp(`<button[^>]*id="${id}"[^>]*type="button"`));
  }
  assert.match(html, /<button[^>]*id="addTen"[^>]*aria-label="加十"[^>]*>\+10<\/button>/);
  assert.match(html, /<output[^>]*id="count"[^>]*aria-live="polite"/);
  assert.match(html, /<output[^>]*id="operations"[^>]*aria-live="polite"[^>]*>0<\/output>/);
  assert.match(html, /<style>[\s\S]*:focus-visible/);
  assert.ok(script.includes('mountCounter(document)'));
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:src|href)=/);
});
