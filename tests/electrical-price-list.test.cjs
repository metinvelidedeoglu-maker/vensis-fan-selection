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

test('electrical price list supplies all 100 named and currently confirmed products',()=>{
  const window=loadCatalog();
  const rows=window.VENSIS_ELECTRICAL_PRODUCTS.flatMap(series=>
    series.submodels.map(model=>({series:series.modelName,...model}))
  );

  assert.equal(window.VENSIS_ELECTRICAL_PRICE_LIST_META.rowCount,100);
  assert.equal(window.VENSIS_ELECTRICAL_PRICE_LIST_META.currentPricesConfirmed,true);
  assert.equal(window.VENSIS_ELECTRICAL_PRICE_LIST_META.documentTitle,'2024-1 Fiyat Listesi');
  assert.equal(window.VENSIS_ELECTRICAL_PRICE_LIST_META.sourceSha256,'9ead2999713365d7a66954a0218aee766327186872c9e667b431ed1b19f1759d');
  assert.equal(rows.length,100);
  assert.equal(rows.filter(row=>row.name).length,100);
  assert.equal(new Set(rows.map(row=>`${row.series}|${row.orderCode}`)).size,100);

  const find=(series,orderCode)=>rows.find(row=>row.series===series&&row.orderCode===orderCode);
  assert.equal(find('ZNEQ.X','102201').name,'Start Butonu');
  assert.equal(find('ZNEQ.X','102202').name,'Stop Butonu');
  assert.equal(find('ZNEQ.X','102207').name,'Komütatör / Kutup Değiştirici Anahtar');
  assert.equal(find('ZNEQ.X','102207').price,'70 EUR');
  assert.equal(find('ZNB.CE','101901').name,'Start Butonu');
  assert.equal(find('ZNB.CE','101902').name,'Stop Butonu');
  assert.equal(find('ZNB.X','102107').price,'1850 EUR');
  assert.equal(find('ZNF.EX','101301').price,'260 EUR');
  assert.equal(find('ZNP.X','101208').name,'Acil Kitli Led Tube (Uzun)');
});

test('electrical cards show descriptions and prices without exposing order codes',()=>{
  const script=fs.readFileSync(path.join(root,'electrical/catalog.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'electrical/index.html'),'utf8');
  assert.match(html,/data-zonex-price-list\.js\?v=20260827-current-prices-r3/);
  assert.match(html,/catalog\.js\?v=20260827-current-prices-r3/);
  assert.match(script,/description:model\.name\|\|model\.subcategory/);
  assert.match(script,/const identity=model\.orderCode\|\|model\.model/);
  assert.match(script,/String\(item\.orderCode\|\|item\.model\)/);
  assert.match(script,/class="model-name"/);
  assert.doesNotMatch(script,/modelField\('Order Code'/);
});
