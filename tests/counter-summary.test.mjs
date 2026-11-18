import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('summary is one read-only paragraph in the counter panel', () => {
  assert.equal([...html.matchAll(/\bid="counter-summary"/g)].length, 1);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const summary = main.match(/<p\b([^>]*\bid="counter-summary"[^>]*)>([^<]*)<\/p>/);
  assert.ok(summary);
  assert.equal(summary[2], '当前计数：0；累计操作：0');
  assert.doesNotMatch(summary[1], /\b(?:contenteditable|hidden|aria-hidden)\b/i);
});

test('summary renders the same state after every button click including resets at zero', () => {
  const elements = new Map();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set('#' + id, {
      textContent: '',
      listeners: [],
      addEventListener(type, handler) {
        assert.equal(type, 'click');
        this.listeners.push(handler);
      },
    });
  }
  const { mountCounter } = runInNewContext(script + ';({ mountCounter })');
  const counter = mountCounter({ querySelector: selector => elements.get(selector) });
  const check = (value, operations) => {
    assert.equal(counter.value, value);
    assert.equal(counter.operations, operations);
    assert.equal(elements.get('#count').textContent, String(value));
    assert.equal(elements.get('#operations').textContent, String(operations));
    assert.equal(elements.get('#counter-summary').textContent,
      `当前计数：${value}；累计操作：${operations}`);
  };
  check(0, 0);
  const steps = [
    ['reset', 0], ['reset', 0], ['decrement', -1], ['decrement', -2],
    ['increment', -1], ['addTen', 9], ['addTen', 19], ['reset', 0],
    ['increment', 1], ['decrement', 0], ['reset', 0],
  ];
  for (const [index, [action, value]] of steps.entries()) {
    const button = elements.get('#' + action);
    assert.equal(button.listeners.length, 1, 'each button has exactly one counter handler');
    button.listeners[0]();
    check(value, index + 1);
  }
  assert.equal(elements.get('#counter-summary').listeners.length, 0);
});
