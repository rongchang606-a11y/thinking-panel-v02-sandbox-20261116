import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('production build copies the HTML, exact PNG and manifest into a fresh delivery directory', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const workspace = mkdtempSync(join(root, '.build-test-'));
  try {
    mkdirSync(join(workspace, 'assets/v04'), { recursive: true });
    const files = ['index.html', 'assets/v04/background.png', 'assets/v04/manifest.json'];
    for (const file of files) copyFileSync(join(root, file), join(workspace, file));
    // Exercise the protected production script unchanged, using the test runner's Node.
    const result = spawnSync(process.execPath, [join(root, 'scripts/build.mjs')], {
      cwd: workspace, encoding: 'utf8', timeout: 30000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    for (const file of files) {
      assert.deepEqual(readFileSync(join(workspace, 'dist', file)), readFileSync(join(root, file)), file);
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
