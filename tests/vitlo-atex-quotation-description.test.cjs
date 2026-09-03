const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../js/desktop-editor-toggle.js'),'utf8');

test('quotation marking includes the agreed Zone 1 gas and Zone 21 dust ATEX text',()=>{
  assert.ok(source.includes('ATEX: Zone 1 Gas / Zone 21 Dust'));
  assert.ok(source.includes('II 2G Ex db IIC T4 Gb'));
  assert.ok(source.includes('II 2D Ex tb IIIC T125°C Db'));
});

test('automatic ATEX quotation marking is scoped to Vitlo Ex-Proof identities',()=>{
  assert.ok(source.includes("manufacturer!=='VITLO'"));
  assert.ok(source.includes('/\\/ATEX\\b/i'));
  assert.ok(source.includes('/\\bEX[\\s-]?PROOF\\b/i'));
});

test('automatic ATEX marking is limited to quotation fan tables',()=>{
  assert.ok(source.includes("config.kind!=='quotation'"));
  assert.ok(source.includes('SELECTED / NOMINAL'));
  assert.ok(source.includes('vitlo-atex-quotation-marking'));
});

test('quotation marking is appended as a separate product-description block',()=>{
  assert.ok(source.includes("marking.className='product-description vitlo-atex-quotation-marking'"));
  assert.ok(source.includes('detail.appendChild(marking)'));
});
