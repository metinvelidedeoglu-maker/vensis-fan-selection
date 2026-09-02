import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadRows(){
  const code=fs.readFileSync(new URL('../data/fans-16.js',import.meta.url),'utf8');
  const context={window:{models:[]}};
  vm.createContext(context);
  vm.runInContext(code,context,{filename:'data/fans-16.js'});
  return context.window.models;
}

test('CRS/CRH 31-2T-2 family exposes four requested variants',()=>{
  const rows=loadRows();
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(row=>row.series),['CRS/ATEX','CRS','CRH','CRH/ATEX']);
  assert.deepEqual(rows.map(row=>row.model),[
    'CRS/ATEX 31-2T-2',
    'CRS 31-2T-2',
    'CRH 31-2T-2',
    'CRH/ATEX 31-2T-2'
  ]);
});

test('derived variants keep the supplied model performance and dimensions',()=>{
  const rows=loadRows();
  for(const row of rows){
    assert.equal(row.nominal,4400);
    assert.equal(row.kw,1.5);
    assert.equal(row.rpm,2865);
    assert.equal(row.amps,3.25);
    assert.equal(row.spl,68);
    assert.equal(row.voltage,'400 V');
    assert.equal(row.frequency,'50 Hz');
    assert.equal(row.poles,2);
    assert.equal(row.ipClass,'IP55');
    assert.equal(row.dimensions.A,550);
    assert.equal(row.dimensions.B,650);
    assert.equal(row.dimensions.C,500);
    assert.equal(row.dimensions.H,380);
    assert.deepEqual(Array.from(row.curves[0].sourcePoints.at(-1)),[400,4400]);
  }
});

test('each variant uses its requested series artwork',()=>{
  const bySeries=new Map(loadRows().map(row=>[row.series,row]));
  assert.equal(bySeries.get('CRS').image,'assets/products/CRS.webp');
  assert.equal(bySeries.get('CRS/ATEX').image,'assets/products/CRS-ATEX.webp');
  assert.equal(bySeries.get('CRH').image,'assets/products/CRH.webp');
  assert.equal(bySeries.get('CRH/ATEX').image,'assets/products/CRH-ATEX.webp');
});

test('exact ATEX marking is asserted only for the supplied CRS/ATEX datasheet',()=>{
  const bySeries=new Map(loadRows().map(row=>[row.series,row]));
  assert.equal(bySeries.get('CRS/ATEX').atexProtection,'EXII2G EEX-D IIC T4');
  assert.equal(bySeries.get('CRS/ATEX').atex,true);
  assert.equal(bySeries.get('CRH/ATEX').atex,true);
  assert.equal(bySeries.get('CRH/ATEX').atexProtection,undefined);
  assert.equal(bySeries.get('CRS').atex,false);
  assert.equal(bySeries.get('CRH').atex,false);
});
