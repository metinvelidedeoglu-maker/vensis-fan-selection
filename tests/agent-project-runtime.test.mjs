import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

test('project creation, legacy approval recovery, persistent quotes and guarded updates', () => {
  const php = process.env.PHP_BIN || 'php';
  const dir = mkdtempSync(join(tmpdir(), 'vensis-project-test-'));
  try {
    const root = join(dir, 'public_html');
    cpSync(resolve('api'), join(root, 'api'), { recursive: true });
    if(process.platform==='win32'){
      const adapters={
        'agent/approval.php':[
          'if (@file_put_contents($temporary, $encoded, LOCK_EX) === false || !@rename($temporary, $path)) {',
          'if (@file_put_contents($path, $encoded, LOCK_EX) === false) {'
        ],
        'projects/bootstrap.php':[
          'if (@file_put_contents($temporary, $json, LOCK_EX) === false || !@chmod($temporary, 0600) || !@rename($temporary, $path)) {',
          'if (@file_put_contents($path, $json, LOCK_EX) === false) {'
        ]
      };
      for(const [relative,[needle,replacement]] of Object.entries(adapters)){
        const file=join(root,'api',relative);
        const source=readFileSync(file,'utf8');
        const patched=source.replace(needle,replacement);
        assert.notEqual(patched,source,`${relative} Windows test adapter was not applied`);
        writeFileSync(file,patched);
      }
    }
    const output = execFileSync(php, ['-n', resolve('tests/agent-project-runtime.php'), root], {
      env: { ...process.env, VENSIS_AGENT_PRIVATE_DIR: join(dir, '.vensis-edit') }, encoding: 'utf8',
    });
    const result = JSON.parse(output);
    assert.ok(result.passed >= 58, output);
    assert.equal(result.projects, 1);
    assert.ok(result.drafts>=2, output);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
