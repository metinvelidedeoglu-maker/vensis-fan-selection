const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('quotation accessory rows show model and manufacturer before commercial columns',()=>{
  const source=read('js/quotation-accessory-minimal.js');
  assert.match(source,/productType\|\|'[\s\S]*accessory/);
  assert.match(source,/first\.colSpan!==5/);
  assert.match(source,/item\.model\|\|'Aksesuar'/);
  assert.match(source,/item\.manufacturer/);
  assert.match(source,/vensis-accessory-brand/);
  assert.match(source,/while\(row\.children\.length>4\)/);
  assert.doesNotMatch(source,/item\.series/);
  assert.doesNotMatch(source,/item\.orderCode/);
  assert.doesNotMatch(source,/nominalAirflow|selected\?\.|motorPower|currentText/);
});

test('C 2,5 speed controller remains Vortice with EUR 66 catalog price',()=>{
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(read('data/accessories-catalog.js'),context,{filename:'data/accessories-catalog.js'});
  const item=context.window.VensisAccessoriesCatalog.items.find(row=>row.model==='C 2,5 Hız Anahtarı');
  assert.ok(item);
  assert.equal(item.manufacturer,'Vortice');
  assert.equal(item.price,66);
  assert.equal(context.window.VensisAccessoriesCatalog.currency,'EUR');
});

test('quotation page loads the accessory renderer with current cache version',()=>{
  const overrides=read('data/series-overrides.js');
  assert.match(overrides,/quotation-accessory-minimal\.js\?v=20260908-r2/);
});
