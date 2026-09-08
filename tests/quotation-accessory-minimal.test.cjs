const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('quotation accessory rows show only the accessory model before commercial columns',()=>{
  const source=read('js/quotation-accessory-minimal.js');
  assert.match(source,/productType\|\|'[\s\S]*accessory/);
  assert.match(source,/first\.colSpan!==5/);
  assert.match(source,/item\.model\|\|'Aksesuar'/);
  assert.match(source,/while\(row\.children\.length>4\)/);
  assert.doesNotMatch(source,/item\.series/);
  assert.doesNotMatch(source,/item\.manufacturer/);
  assert.doesNotMatch(source,/item\.orderCode/);
  assert.doesNotMatch(source,/nominalAirflow|selected\?\.|motorPower|currentText/);
});

test('quotation page loads the minimal accessory renderer',()=>{
  const overrides=read('data/series-overrides.js');
  assert.match(overrides,/quotation-accessory-minimal\.js\?v=20260908-r1/);
});
