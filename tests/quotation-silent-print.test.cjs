const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('catalogue pricing refreshes stale SILENT prices but preserves manual quote prices',()=>{
  const source=read('js/pricing.js');
  const model={id:'silent-200-crz',model:'SILENT-200 CRZ',pricing:{listPrice:90.3,currency:'EUR',catalogue:'catalog'}};
  const window={
    VensisCatalog:{models:[model],getModel:key=>key==='silent-200-crz'?model:null},
    VensisSPSilentPolicy20260908:{applyCatalog(){model.pricing.listPrice=129;}}
  };
  vm.runInNewContext(source,{window});

  const stale={productKey:'silent-200-crz',model:'SILENT-200 CRZ',price:90.3,priceSource:'catalog',priceCurrency:'EUR'};
  assert.equal(window.VensisPricing.enrichItems([stale]),true);
  assert.equal(stale.price,129);

  const manual={productKey:'silent-200-crz',model:'SILENT-200 CRZ',price:111,priceSource:'manual',priceCurrency:'EUR'};
  assert.equal(window.VensisPricing.enrichItems([manual]),false);
  assert.equal(manual.price,111);

  const missingKey={model:'SILENT-200 CRZ',price:90.3,priceSource:'catalog'};
  assert.equal(window.VensisPricing.enrichItems([missingKey]),true);
  assert.equal(missingKey.price,129);
});

test('quotation loads the SILENT correction layer with cache-busted URL',()=>{
  const overrides=read('data/series-overrides.js');
  assert.match(overrides,/quotation\\\.html/);
  assert.match(overrides,/js\/quotation-silent-fix\.js\?v=20260908-no-controller-r1/);
});

test('quotation SILENT correction omits controller note and compacts first printed page',()=>{
  const fix=read('js/quotation-silent-fix.js');
  assert.doesNotMatch(fix,/speedControllerIncluded/);
  assert.match(fix,/#quotationContent>\.quote-page:first-child/);
  assert.match(fix,/@media print/);
  assert.match(fix,/quote-table td\{padding:5px 4px/);
});
