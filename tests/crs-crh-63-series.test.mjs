import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadRows(){
  const code=fs.readFileSync(new URL('../data/fans-17.js',import.meta.url),'utf8');
  const context={window:{models:[]}};
  vm.createContext(context);
  vm.runInContext(code,context,{filename:'data/fans-17.js'});
  return context.window.models;
}

test('CRS/CRH 63-2T-40 family exposes four requested variants',()=>{
  const rows=loadRows();
  assert.equal(rows.length,4);
  assert.deepEqual(Array.from(rows,row=>row.series),['CRS/ATEX','CRS','CRH','CRH/ATEX']);
  assert.deepEqual(Array.from(rows,row=>row.model),[
    'CRS/ATEX 63-2T-40',
    'CRS 63-2T-40',
    'CRH 63-2T-40',
    'CRH/ATEX 63-2T-40'
  ]);
});

test('derived variants keep the supplied model performance and dimensions',()=>{
  const rows=loadRows();
  for(const row of rows){
    assert.equal(row.nominal,19430);
    assert.equal(row.kw,30);
    assert.equal(row.rpm,2960);
    assert.equal(row.amps,52.2);
    assert.equal(row.spl,86);
    assert.equal(row.voltage,'400 V');
    assert.equal(row.frequency,'50 Hz');
    assert.equal(row.poles,2);
    assert.equal(row.ipClass,'IP65');
    assert.equal(row.motorFrameSize,'180');
    assert.equal(row.efficiencyPct,72);
    assert.equal(row.dimensions.A,1100);
    assert.equal(row.dimensions.B,1200);
    assert.equal(row.dimensions.C,950);
    assert.equal(row.dimensions.H,750);
    assert.equal(row.operatingPoints[0].staticPressurePa,3000);
    assert.equal(row.operatingPoints[0].mechanicalPowerAtWorkingPointKw,27.3);
    assert.deepEqual(Array.from(row.curves[0].sourcePoints.at(-1)),[3000,19430]);
  }
});

test('each variant uses its requested series artwork',()=>{
  const bySeries=new Map(Array.from(loadRows(),row=>[row.series,row]));
  assert.equal(bySeries.get('CRS').image,'assets/products/CRS.webp');
  assert.equal(bySeries.get('CRS/ATEX').image,'assets/products/CRS-ATEX.webp');
  assert.equal(bySeries.get('CRH').image,'assets/products/CRH.webp');
  assert.equal(bySeries.get('CRH/ATEX').image,'assets/products/CRH-ATEX.webp');
});

test('only CRS/ATEX has the supplied exact ATEX marking and 17000 EUR price',()=>{
  const bySeries=new Map(Array.from(loadRows(),row=>[row.series,row]));
  assert.equal(bySeries.get('CRS/ATEX').atexProtection,'EXII2G EEX-D IIC T4');
  assert.equal(bySeries.get('CRS/ATEX').atex,true);
  assert.equal(bySeries.get('CRS/ATEX').price,17000);
  assert.equal(bySeries.get('CRH/ATEX').atex,true);
  assert.equal(bySeries.get('CRH/ATEX').atexProtection,undefined);
  assert.equal(bySeries.get('CRH/ATEX').price,undefined);
  assert.equal(bySeries.get('CRS').atex,false);
  assert.equal(bySeries.get('CRS').price,undefined);
  assert.equal(bySeries.get('CRH').atex,false);
  assert.equal(bySeries.get('CRH').price,undefined);
});

test('Vitlo catalog loader includes the new 63-2T-40 family',()=>{
  const loader=fs.readFileSync(new URL('../data/series-overrides.js',import.meta.url),'utf8');
  assert.match(loader,/fans-17\.js\?v=20260902-crs-crh-63-r1/);
});

test('explicit row price is normalized as EUR for rich product offers',()=>{
  const registry=fs.readFileSync(new URL('../products/registry.js',import.meta.url),'utf8');
  assert.match(registry,/hasOwnProperty\.call\(row\|\|\{},'price'\)/);
  assert.match(registry,/currency:'EUR'/);
});
