import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

test('project creation, legacy approval recovery, persistent quotes and guarded updates', () => {
  const php = process.env.PHP_BIN || 'php';
  const dir = mkdtempSync(join(tmpdir(), 'vensis-project-test-'));
  try {
    const root = join(dir, 'public_html');
    cpSync(resolve('api'), join(root, 'api'), { recursive: true });
    const output = execFileSync(php, ['-n', resolve('tests/agent-project-runtime.php'), root], {
      env: { ...process.env, VENSIS_AGENT_PRIVATE_DIR: join(dir, '.vensis-edit') }, encoding: 'utf8',
    });
    const result = JSON.parse(output);
    assert.ok(result.passed >= 25);
    assert.equal(result.projects, 1);
    assert.equal(result.drafts, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
