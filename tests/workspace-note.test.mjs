import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const readme = read('../README.md');

test('workspace note renders the selected B wording once inside the main content', () => {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.equal((html.match(/\bid="workspace-note"/g) ?? []).length, 1);
  assert.match(main, /<p class="description">从零开始，记录你的每一次变化。<\/p>\s*<p class="description" id="workflow-status">先记录，再推进<\/p>\s*<p class="description" id="workspace-note">先验证，再扩展<\/p>\s*<output id="count"/);
  assert.doesNotMatch(main, /按目标稳步推进/);
  const note = main.match(/<p\b[^>]*id="workspace-note"[^>]*>/)[0];
  assert.doesNotMatch(note, /\b(?:hidden|style|aria-hidden)\b/i);
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(styles, /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\s|;|}))/i);
});

test('shared document preserves the complete revision 1 snapshot', () => {
  const expected = '工作台共享文档验证标识：workspace-v05。只操作独立测试仓库，保留计数器、累计操作次数和连续开发项目说明。需要本人决定时，先提交结构化决策请求，收到选择后再实现。测试和构建使用隔离 Node24；交付真实 Commit、CI 和未合并 PR。README 记录本文件的标题、版本及验证标识。';
  assert.equal(read('../docs/workspace-v05.md').trimEnd(), expected);
});

test('README records the actual decision and the shared document identity', () => {
  assert.match(readme, /workspace-note-tone/);
  assert.match(readme, /2026-11-17T13:10:41\.525Z/);
  assert.match(readme, /选择 B「先验证后扩展」/);
  assert.match(readme, /内容为“先验证，再扩展”/);
  assert.match(readme, /《V0\.5 协作与交付约定》，版本 1（revision: 1），验证标识 `workspace-v05`/);
  assert.match(readme, /\[docs\/workspace-v05\.md\]\(docs\/workspace-v05\.md\)/);
});
