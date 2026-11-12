// The CR dimension renderer adds mechanical measurements to the browser
// catalogue only; agent selection entries have no dimension field. This
// regression enforces that all agent models and accessories remain identical.
// The sourceHash changes because products/ventilation.js is included in it.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const committed=JSON.parse(execFileSync('git',['show','HEAD:api/agent/catalog-v1.json'],{encoding:'utf8',maxBuffer:12*1024*1024}));
const compiled=JSON.parse(fs.readFileSync('api/agent/catalog-v1.json','utf8'));
assert.equal(compiled.schemaVersion,committed.schemaVersion);
assert.deepEqual(compiled.models,committed.models,'CR dimension backfill must not change agent selection rows');
assert.deepEqual(compiled.accessories,committed.accessories,'CR dimension backfill must not change accessories');
assert.match(compiled.sourceHash,/^[0-9a-f]{64}$/);
assert.notEqual(compiled.sourceHash,committed.sourceHash);
console.log('PASS: agent rows and accessories unchanged; only source fingerprint differs for UI mechanical dimensions.');
