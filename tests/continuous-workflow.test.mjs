import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(new URL('../' + path, import.meta.url));

test('B manifest and shared document retain their exact input bytes', () => {
  for (const [path, hash] of [
    ['assets/v04/manifest.json', 'f0f878ffcfb1f2b4f454c06b73d8ddc45d7fbbcaa1c889a1cfbd625d560c930f'],
    ['docs/workspace-v05.md', '0a4788430935432b4ff5cb8f1850acd9cedceb74019350da4928122462b426c2'],
  ]) assert.equal(createHash('sha256').update(read(path)).digest('hex'), hash, path);
});

test('final documentation records exact A/B versions, fixed documents and retained add-ten behavior', () => {
  for (const path of ['README.md', 'docs/continuous-workflow.md']) {
    const content = read(path).toString('utf8');
    for (const required of ['99ebaf06cf3b864b408f0d8d8ee0959214bc9fd5', 'd3932c2be5f8874933d75f18deaaf1056353192b', 'workspace-v05', 'revision 1', '先记录，再推进', '先验证，再扩展', '+10']) {
      assert.ok(content.includes(required), path + ': ' + required);
    }
  }
});

test('both note paragraphs remain outside the mountain hidden by focus mode', () => {
  const html = read('index.html').toString('utf8');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const css = html.match(/<style id="focus-styles">([\s\S]*?)<\/style>/)[1];
  assert.match(main, /id="workflow-status"/);
  assert.match(main, /id="workspace-note"/);
  assert.match(css, /\.workspace\.is-focused \.mountain\s*\{ display: none; \}/);
  assert.doesNotMatch(css, /(?:#workflow-status|#workspace-note|\.description)[^{]*\{[^}]*(?:display:\s*none|visibility:\s*hidden)/);
});
