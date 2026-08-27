const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function loadCatalog(){
  const context={window:{}};
  vm.createContext(context);
  for(const file of ['electrical/data-zonex.js','electrical/data-zonex-price-list.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  return context.window;
}

test('electrical price list supplies all 100 named products',()=>{
  const window=loadCatalog();
  const rows=window.VENSIS_ELECTRICAL_PRODUCTS.flatMap(series=>
    series.submodels.map(model=>({series:series.modelName,...model}))
  );

  assert.equal(window.VENSIS_ELECTRICAL_PRICE_LIST_META.rowCount,100);
  assert.equal(rows.length,100);
  assert.equal(rows.filter(row=>row.name).length,100);
  assert.equal(new Set(rows.map(row=>`${row.series}|${row.orderCode}`)).size,100);

  const find=(series,orderCode)=>rows.find(row=>row.series===series&&row.orderCode===orderCode);
  assert.equal(find('ZNEQ.X','102201').name,'Start Butonu');
  assert.equal(find('ZNEQ.X','102202').name,'Stop Butonu');
  assert.equal(find('ZNEQ.X','102207').name,'Komütatör / Kutup Değiştirici Anahtar');
  assert.equal(find('ZNB.CE','101901').name,'Start Butonu');
  assert.equal(find('ZNB.CE','101902').name,'Stop Butonu');
  assert.equal(find('ZNF.EX','101301').price,'260 EUR');
  assert.equal(find('ZNP.X','101208').name,'Acil Kitli Led Tube (Uzun)');
});

test('electrical cards and project lines use description and order-code identity',()=>{
  const script=fs.readFileSync(path.join(root,'electrical/catalog.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'electrical/index.html'),'utf8');
  assert.match(html,/data-zonex-price-list\.js\?v=20260827-price-descriptions-r1/);
  assert.match(script,/description:model\.name\|\|model\.subcategory/);
  assert.match(script,/const identity=model\.orderCode\|\|model\.model/);
  assert.match(script,/String\(item\.orderCode\|\|item\.model\)/);
  assert.match(script,/class="model-name"/);
});
