const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('accessories without images do not render a substitute visual',()=>{
  const suite=read('js/accessory-suite.js');
  assert.doesNotMatch(suite,/vensis-accessory-arrow/);
  assert.doesNotMatch(suite,/↳/);
  assert.match(suite,/function accessoryProjectMarkup\(item\)/);
  assert.match(suite,/function quoteAccessoryMarkup\(item\)/);
  assert.match(suite,/function printAccessoryMarkup\(item\)/);
});

test('the accessory display cache is refreshed on every related screen',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/accessory-suite\.js\?v=20260908-empty-image-r1/);
  for(const file of ['project.html','quotation.html','project-print.html']){
    assert.match(read(file),/access-gate\.js\?v=20260908-empty-image-r1/,file);
  }
});
