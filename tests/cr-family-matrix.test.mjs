import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const dataFiles=[
  'data/fans-01.js','data/fans-02.js','data/fans-03.js','data/fans-04.js',
  'data/fans-05.js','data/fans-06.js','data/fans-07.js','data/fans-08.js',
  'data/fans-15.js','data/fans-16.js','data/fans-17.js'
];
const targets=['CRS','CRS/ATEX','CRK','CRK/ATEX','CRD','CRD/ATEX','CRH','CRH/ATEX'];

function runFile(context,path){
  const code=fs.readFileSync(new URL(path,root),'utf8');
  vm.runInContext(code,context,{filename:path});
}

function load(){
  const context={window:{models:[]},console};
  vm.createContext(context);
  for(const path of dataFiles)runFile(context,path);
  const before=context.window.models.map(row=>({key:row.key,model:row.model,series:row.series,price:row.price}));
  runFile(context,'data/cr-family-matrix.js');
  return {context,before,rows:context.window.models,report:context.window.VensisCRFamilyMatrixReport};
}

function profile(row){
  const match=String(row?.model||'').match(/(?:^|\s)(\d+)\s*-\s*([24])T/i);
  const kw=Number(row?.kw);
  return match&&Number.isFinite(kw)?`${Number(match[1])}|${Number(match[2])}|${String(Math.round(kw*10000)/10000)}`:'';
}

test('matrix completes every discovered 2T/4T CR profile across eight sibling series',()=>{
  const {report}=load();
  assert.ok(report);
  assert.ok(report.profileCount>0);
  assert.ok(report.addedCount>0);
  assert.deepEqual(Array.from(report.series),targets);
  for(const row of report.profiles){
    assert.ok(row.poles===2||row.poles===4);
    for(const series of targets)assert.equal(row[series],true,`${row.profile} missing ${series}`);
  }
});

test('new CRK/ATEX series is generated without invented price, dimensions or exact ATEX marking',()=>{
  const {rows}=load();
  const generated=rows.filter(row=>row.series==='CRK/ATEX');
  assert.ok(generated.length>0);
  for(const row of generated){
    assert.equal(row.atex,true);
    assert.equal(row.price,undefined);
    assert.equal(row.pricing,undefined);
    assert.equal(row.dimensions,undefined);
    assert.equal(row.atexProtection,undefined);
    assert.equal(row.image,'assets/products/CRK.webp');
    assert.equal(row.seriesCode,'CRK/ATEX');
  }
});

test('existing prices stay untouched and derived rows never inherit price',()=>{
  const {before,rows}=load();
  const byKey=new Map(rows.map(row=>[row.key,row]));
  for(const original of before){
    const current=byKey.get(original.key);
    assert.ok(current,original.key);
    assert.equal(current.price,original.price,original.key);
  }
  for(const row of rows.filter(row=>row.matrixDerived)){
    assert.equal(row.price,undefined,row.model);
    assert.equal(row.pricing,undefined,row.model);
  }
});

test('63-2T-40 supplied profile expands to all eight siblings while 17000 EUR stays only on CRS/ATEX',()=>{
  const {rows}=load();
  const key='63|2|30';
  const family=rows.filter(row=>targets.includes(row.series)&&profile(row)===key);
  assert.equal(new Set(family.map(row=>row.series)).size,8);
  const bySeries=new Map(family.map(row=>[row.series,row]));
  assert.equal(bySeries.get('CRS/ATEX').price,17000);
  for(const series of targets.filter(series=>series!=='CRS/ATEX'))assert.equal(bySeries.get(series).price,undefined,series);
  for(const series of targets){
    const row=bySeries.get(series);
    assert.equal(row.nominal,19430,series);
    assert.equal(row.kw,30,series);
    assert.equal(row.rpm,2960,series);
    assert.equal(row.amps,52.2,series);
    assert.ok(Array.isArray(row.curves)&&row.curves.length,series);
  }
});

test('legacy 50-4T 2.2 kW profile also expands to all eight siblings',()=>{
  const {rows}=load();
  const key='50|4|2.2';
  const family=rows.filter(row=>targets.includes(row.series)&&profile(row)===key);
  assert.equal(new Set(family.map(row=>row.series)).size,8);
  for(const series of targets)assert.ok(family.some(row=>row.series===series),series);
  assert.ok(family.some(row=>row.series==='CRK/ATEX'&&row.matrixDerived));
});
