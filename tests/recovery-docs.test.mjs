import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const readme = readFileSync(new URL('README.md', root), 'utf8');
const doc = readFileSync(new URL('docs/recovery-and-permissions.md', root), 'utf8');

test('README exposes a readable recovery guide and its repository document links resolve', () => {
  assert.match(readme, /\[[^\]]+\]\(docs\/recovery-and-permissions\.md\)/);
  for (const source of ['README.md', 'docs/recovery-and-permissions.md']) {
    const url = new URL(source, root);
    const text = readFileSync(url, 'utf8');
    for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g)) {
      const linked = new URL(target, url);
      assert.ok(linked.href.startsWith(root.href));
      assert.ok(statSync(linked).isFile(), target);
      assert.ok(readFileSync(linked, 'utf8').trim().length > 0, target);
    }
  }
});

test('recovery guide records limited recovery, permission boundaries and pending human acceptance', () => {
  assert.ok(readme.includes('3e9f13b8684680794dc10642c9bfe4203d42bdd5'));
  for (const text of ['revision 1', 'workspace-v05', '有限恢复', '刷新或重新打开后',
    '不能把普通方案选择当作付费、删除重要文件、发布的授权',
    '主分支不自动合并', 'PR 保持未合并', '没有完成浏览器或本人验收']) {
    assert.ok(doc.includes(text), text);
  }
});
