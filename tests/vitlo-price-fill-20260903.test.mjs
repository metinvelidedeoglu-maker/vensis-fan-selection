import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const verified={
  'CRH 35-4T':920,
  'CRH 40-4T':1070,
  'CRH/ATEX 35-4T-0.75':1960,
  'CRH/ATEX 45-4T-2':2500,
  'CRH/ATEX 56-4T-4':3660,
  'CRH/ATEX 71-4T-15':6600,
  'CRK 31-4T':1180,
  'CRK 35-4T':1280,
  'CRK 40-4T':1530,
  'CRK 45-2T-10':4900,
  'CRK/ATEX 40-4T-1':2560,
  'CRK/ATEX 71-4T-15':8360,
  'CRK/ATEX 80-4T-25':12700,
  'CRS 45-2T-10':1960,
  'CRS 56-4T':1700,
  'CRS 71-4T-15':3520,
  'CRS/ATEX 31-4T':1750,
  'CRS/ATEX 35-4T-0.75':1920,
  'CRS/ATEX 45-2T-10':5720,
  'CRS/ATEX 56-2T-20':8720,
  'CRS/ATEX 56-4T':3500,
  'CRS/ATEX 71-4T':6900
};

function run(rows){
  const context={window:{models:rows},console};
  vm.createContext(context);
  const code=fs.readFileSync(new URL('../data/vitlo-price-fill-20260903.js',import.meta.url),'utf8');
  vm.runInContext(code,context,{filename:'data/vitlo-price-fill-20260903.js'});
  return context.window;
}

test('fills the 22 unambiguous filtered-list prices in EUR',()=>{
  const rows=Object.keys(verified).map(model=>({brand:'Vitlo',model}));
  const window=run(rows);
  for(const row of rows){
    assert.equal(row.price,verified[row.model],row.model);
    assert.equal(row.priceCurrency,'EUR',row.model);
  }
  assert.equal(window.VensisVitloPriceFill20260903Report.requestedUniqueModels,22);
  assert.equal(window.VensisVitloPriceFill20260903Report.appliedCount,22);
});

test('normalizes comma decimals but never overwrites an existing positive price',()=>{
  const rows=[
    {brand:'Vitlo',model:'CRH/ATEX 35-4T-0,75'},
    {brand:'Vitlo',model:'CRS/ATEX 45-2T-10',price:9999}
  ];
  run(rows);
  assert.equal(rows[0].price,1960);
  assert.equal(rows[1].price,9999);
});

test('leaves the two same-model source conflicts unresolved',()=>{
  const rows=[
    {brand:'Vitlo',model:'CRK/ATEX 35-4T'},
    {brand:'Vitlo',model:'CRS 50-4T'}
  ];
  const window=run(rows);
  assert.equal(rows[0].price,undefined);
  assert.equal(rows[1].price,undefined);
  assert.deepEqual(
    Array.from(window.VensisVitloPriceFill20260903Report.conflicts,entry=>[entry.model,Array.from(entry.values)]),
    [['CRK/ATEX 35-4T',[2960,2720]],['CRS 50-4T',[1600,1400]]]
  );
});
