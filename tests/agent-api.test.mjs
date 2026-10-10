import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'api/agent/catalog-v1.json');

test('agent catalog is reproducible and mirrors the active selection catalog',()=>{
  const before=fs.readFileSync(catalogPath,'utf8');
  childProcess.execFileSync(process.execPath,['scripts/build-agent-catalog.mjs'],{cwd:root,stdio:'pipe'});
  const after=fs.readFileSync(catalogPath,'utf8');
  assert.equal(after,before,'generated agent catalog is stale or non-deterministic');

  const catalog=JSON.parse(after);
  assert.equal(catalog.schemaVersion,1);
  assert.match(catalog.sourceHash,/^[a-f0-9]{64}$/);
  assert.ok(catalog.models.length>1000,'selection variants are unexpectedly incomplete');
  assert.ok(catalog.accessories.items.length>50,'accessory catalog is unexpectedly incomplete');
  assert.equal(new Set(catalog.models.map(model=>model.id)).size,catalog.models.length,'selection variant ids must be unique');
  assert.equal(new Set(catalog.accessories.items.map(item=>item.id)).size,catalog.accessories.items.length,'accessory ids must be unique');

  const verified=catalog.models.find(model=>model.model==='AXW/ATEX 63-4T-3');
  assert.ok(verified,'known verified selection model is missing');
  assert.equal(verified.quoteEligible,true);
  assert.ok(verified.selectionPoints.length>=2);
  assert.ok(verified.pricing.listPrice>0);

  const provisional=catalog.models.filter(model=>model.series==='SEAT 25');
  assert.ok(provisional.length>0,'known engineering-review models are missing');
  assert.ok(provisional.every(model=>model.verification.status==='needs_engineering_review'));
  assert.ok(provisional.every(model=>model.quoteEligible===false),'engineering-review models must be blocked from quotation drafts');
});

test('agent API keeps Erman separate and least-privileged',()=>{
  const bootstrap=fs.readFileSync(path.join(root,'api/agent/bootstrap.php'),'utf8');
  const domain=fs.readFileSync(path.join(root,'api/agent/domain.php'),'utf8');
  const select=fs.readFileSync(path.join(root,'api/agent/select.php'),'utf8');
  const quote=fs.readFileSync(path.join(root,'api/agent/quote-draft.php'),'utf8');
  const approval=fs.readFileSync(path.join(root,'api/agent/approval.php'),'utf8');
  const approvalRequest=fs.readFileSync(path.join(root,'api/agent/approval-request.php'),'utf8');
  const approvalReview=fs.readFileSync(path.join(root,'api/agent/approval-review.php'),'utf8');
  const approvalStatus=fs.readFileSync(path.join(root,'api/agent/approval-status.php'),'utf8');
  const example=fs.readFileSync(path.join(root,'api/agent/config.example.php'),'utf8');
  const protection=fs.readFileSync(path.join(root,'api/agent/.htaccess'),'utf8');

  assert.match(bootstrap,/Bearer\\s\+\(\[a-z\]/);
  assert.match(bootstrap,/password_verify/);
  assert.match(bootstrap,/secret_sha256/);
  assert.match(bootstrap,/hash_equals\(\$sha256, hash\('sha256', \$secret\)\)/);
  assert.match(bootstrap,/agent-rate-/);
  assert.match(bootstrap,/agent-audit\.jsonl/);
  assert.match(bootstrap,/\.vensis-edit/);
  assert.doesNotMatch(bootstrap,/github_token|edit_require_session|session_start/);
  assert.match(select,/agent_authorize\('fan:select'\)/);
  assert.match(quote,/agent_authorize\('quote:draft'\)/);
  assert.match(approvalRequest,/agent_authorize\('approval:request'\)/);
  assert.match(approvalReview,/agent_authorize\('approval:review'\)/);
  assert.match(approvalStatus,/agent_authorize_any\(\['approval:request', 'approval:review'\]\)/);
  assert.match(domain,/hash_hmac\('sha256'/);
  assert.match(domain,/quoteEligible/);
  assert.match(domain,/approvalRequired'\s*=>\s*true/);
  assert.match(domain,/maximumDiscountPercent/);
  assert.doesNotMatch(select+quote+approval+approvalRequest+approvalReview+approvalStatus,/projects\/save|customers\/sync|mail\s*\(|github/i);
  assert.match(example,/'erman'/);
  assert.match(example,/'erman'[\s\S]*'approval:request'/);
  assert.match(example,/'metin_approver'[\s\S]*'approval:review'/);
  assert.match(example,/'metin_approver'[\s\S]*'active'\s*=>\s*false/);
  assert.match(example,/'secret_sha256'/);
  assert.match(example,/'maximum_discount_percent'\s*=>\s*0/);
  assert.match(protection,/catalog-v1\\\.json/);
});

test('approval workflow is separate, payload-bound and non-executing',()=>{
  const approval=fs.readFileSync(path.join(root,'api/agent/approval.php'),'utf8');
  const domain=fs.readFileSync(path.join(root,'api/agent/domain.php'),'utf8');
  assert.match(approval,/project\.write.*customer\.write.*order\.write.*quotation\.send.*quotation\.publish/);
  assert.match(approval,/Requester and reviewer must be separate identities/);
  assert.match(approval,/agent-approvals-v1\.json/);
  assert.match(approval,/payloadHash.*agent_payload_hash/s);
  assert.match(approval,/approval_grant_ttl_seconds/);
  assert.match(approval,/agent_verify_approval_grant/);
  assert.match(approval,/agent_consume_approval_grant/);
  assert.match(approval,/status'\]\s*=\s*'consumed'/);
  assert.match(approval,/executed'\s*=>\s*false/g);
  assert.match(domain,/approvalRequestOptions/);
  assert.match(domain,/An approval request does not execute the action/);
});

test('OpenAPI publishes selection, draft and approval-gate operations',()=>{
  const specification=fs.readFileSync(path.join(root,'api/agent/openapi.yaml'),'utf8');
  assert.match(specification,/\/select\.php:/);
  assert.match(specification,/\/quote-draft\.php:/);
  assert.match(specification,/\/approval-request\.php:/);
  assert.match(specification,/\/approval-status\.php:/);
  assert.match(specification,/\/approval-review\.php:/);
  assert.match(specification,/never execute|no action executed/i);
  assert.doesNotMatch(specification,/\/projects|\/customers|\/orders|sendEmail/i);
});
