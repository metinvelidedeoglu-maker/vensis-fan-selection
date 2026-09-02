const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'data/vitlo-quote-prices-20260902.js'),'utf8');

function apply(models){
  const context={window:{models}};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'data/vitlo-quote-prices-20260902.js'});
  return context.window;
}

test('fills an exact missing Vitlo price from the quote workbook',()=>{
  const models=[{brand:'Vitlo',model:'AXD 40-2T-2'}];
  const win=apply(models);
  assert.equal(models[0].price,620);
  assert.equal(models[0].priceCurrency,'EUR');
  assert.match(models[0].priceSource,/Historical Vensis quote list/);
  assert.equal(win.VensisQuotePriceFillReport.filled.length,1);
});

test('normalizes decimal comma and decimal point in model identities',()=>{
  const models=[{brand:'Vitlo',model:'AXH 50-2T-5.5'}];
  apply(models);
  assert.equal(models[0].price,1490);
});

test('never overwrites an existing positive catalog price',()=>{
  const models=[{brand:'Vitlo',model:'CRS/ATEX 63-2T-40',price:17000,atexProtection:'II 2G EEX-D IIC T4'}];
  const win=apply(models);
  assert.equal(models[0].price,17000);
  assert.equal(win.VensisQuotePriceFillReport.preserved.length,1);
});

test('skips a model when quote history contains conflicting prices without certification disambiguation',()=>{
  const models=[{brand:'Vitlo',model:'AXF 40-2T-1 F300'}];
  const win=apply(models);
  assert.equal(models[0].price,undefined);
  assert.equal(win.VensisQuotePriceFillReport.ambiguous.length,1);
});

test('uses ATEX certification to disambiguate a conflicting model price',()=>{
  const models=[
    {brand:'Vitlo',model:'AXD/ATEX 35-2T-0.37',atexProtection:'II 3G EEX-E IIC T4'},
    {brand:'Vitlo',model:'AXD/ATEX 35-2T-0,37',atexProtection:'II 2G EEX-D IIC T4'}
  ];
  apply(models);
  assert.equal(models[0].price,1300);
  assert.equal(models[1].price,1320);
});

test('still skips conflicting prices when the same certification itself has multiple prices',()=>{
  const models=[{brand:'Vitlo',model:'CRK/ATEX 35-4T',atexProtection:'II 2G EEX-D IIC T4'}];
  const win=apply(models);
  assert.equal(models[0].price,undefined);
  assert.equal(win.VensisQuotePriceFillReport.ambiguous.length,1);
});

test('price loader runs after CR matrix generation so derived models can receive real quote prices',()=>{
  const loader=fs.readFileSync(path.join(root,'data/series-overrides.js'),'utf8');
  const matrix=loader.indexOf('data/cr-family-matrix.js');
  const prices=loader.indexOf('data/vitlo-quote-prices-20260902.js');
  assert.ok(matrix>=0&&prices>matrix,'quote price loader must run after CR matrix generation');
});
