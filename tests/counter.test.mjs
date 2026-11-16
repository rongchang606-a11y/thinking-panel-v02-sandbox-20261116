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
});

test('all button handlers update the displayed count', () => {
  const elements = new Map();
  for (const id of ['count', 'increment', 'decrement', 'reset']) {
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
  const click = id => elements.get(`#${id}`).click();
  assert.equal(displayed(), '0');
  click('increment');
  click('increment');
  assert.equal(displayed(), '2');
  click('decrement');
  assert.equal(displayed(), '1');
  click('reset');
  assert.equal(displayed(), '0');
  click('decrement');
  assert.equal(displayed(), '-1');
  click('reset');
  assert.equal(displayed(), '0');
});

test('page provides accessible controls and self-contained styles and logic', () => {
  for (const id of ['increment', 'decrement', 'reset']) {
    assert.match(html, new RegExp(`<button[^>]*id="${id}"[^>]*type="button"`));
  }
  assert.match(html, /<output[^>]*id="count"[^>]*aria-live="polite"/);
  assert.match(html, /<style>[\s\S]*:focus-visible/);
  assert.ok(script.includes('mountCounter(document)'));
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:src|href)=/);
});
