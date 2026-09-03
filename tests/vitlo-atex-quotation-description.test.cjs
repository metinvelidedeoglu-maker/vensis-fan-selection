const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../js/desktop-editor-toggle.js'),'utf8');

test('quotation marking includes the agreed Zone 1 gas and Zone 21 dust ATEX text',()=>{
  assert.match(source,/ATEX: Zone 1 Gas \/ Zone 21 Dust/);
  assert.match(source,/II 2G Ex db IIC T4 Gb/);
  assert.match(source,/II 2D Ex tb IIIC T125°C Db/);
});

test('automatic ATEX quotation marking is scoped to Vitlo Ex-Proof identities',()=>{
  assert.match(source,/manufacturer!==['"]VITLO['"]/);
  assert.match(source,/\\\/ATEX/);
  assert.match(source,/EX\[\\s-\]\?PROOF/);
});

test('automatic ATEX marking is limited to quotation fan tables',()=>{
  assert.match(source,/config\.kind!==['"]quotation['"]/);
  assert.match(source,/SELECTED \/ NOMINAL/);
  assert.match(source,/vitlo-atex-quotation-marking/);
});

test('quotation marking is appended as a separate product-description block',()=>{
  assert.match(source,/product-description vitlo-atex-quotation-marking/);
  assert.match(source,/detail\.appendChild\(marking\)/);
});
