import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function loadModels(){
  const models=[];
  for(const file of fs.readdirSync(path.join(root,'data')).filter(name=>/^fans-\d+\.js$/.test(name)).sort()){
    const text=fs.readFileSync(path.join(root,'data',file),'utf8');
    const match=text.match(/^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$/s);
    assert.ok(match,`Unsupported data wrapper in ${file}`);
    models.push(...JSON.parse(match[1]));
  }
  return models;
}

const models=loadModels();

test('catalog contains only verified Vitlo product rows',()=>{
  assert.equal(models.length,623);
  const expectedCounts={
    AXF:48,'BOX-AXF':48,'AXW/ATEX':24,'AXD/ATEX':42,'MOB-AXD/ATEX':9,
    'AXR/ATEX':24,'CRH/ATEX':8,'CRD/ATEX':8,'CRS/ATEX':8,AXD:56,
    'AXD/MOB':10,AXS:56,AXW:24,AXB:17,AXH:56,CD:6,CRB:9,CRD:8,
    CRK:8,CRC:9,CRS:8,CR:9,CRH:8,CRV:8,CRU:9,AXR:24,AXV:24,
    VHR:6,CRR:6,AXJ:4,'TUNEL-AXF':15,'CR-EC':6,'CRU-EC':6,
    'CRB-EC':6,'CRC-EC':6
  };
  const actualCounts={};
  for(const model of models)actualCounts[model.series]=(actualCounts[model.series]||0)+1;
  assert.deepEqual(actualCounts,expectedCounts);
  assert.equal(models.some(model=>Number(model.kw)===0),false);
});

test('only verified catalogue points are stored',()=>{
  let rawCurveCount=0;
  for(const model of models){
    const source=model.sourcePoints||[];
    assert.equal(Object.hasOwn(model,'points'),false,`${model.model} stores generated points`);
    if(!source.length){
      continue;
    }
    rawCurveCount++;
    assert.ok(source.length>=2,`${model.model} has too few source points`);
    for(let index=1;index<source.length;index++){
      assert.ok(source[index][0]>source[index-1][0],`${model.model} pressure order`);
      assert.ok(source[index][1]<=source[index-1][1],`${model.model} airflow order`);
    }
  }
  assert.equal(rawCurveCount,580);
});

test('known multi-table pressure headers match the catalogue',()=>{
  const expected=[
    [50,19100],[100,18000],[150,16800],[200,15400],[250,13500]
  ];
  for(const name of ['AXW/ATEX 63-4T-3','AXD/ATEX 63-4T-3']){
    const model=models.find(row=>row.model===name);
    assert.ok(model,`${name} is missing`);
    assert.deepEqual(model.sourcePoints,expected);
  }
});

test('shifted model and nominal fields are corrected without changing catalogue identity',()=>{
  const axial=models.find(model=>model.model==='AXD 35-4T-0.18');
  assert.ok(axial);
  assert.equal(axial.nominal,2860);
  assert.equal(axial.kw,0.12);

  const mobile=models.find(model=>model.model==='MOB-AXD/ATEX 35-2T-0.75');
  assert.ok(mobile);
  assert.equal(mobile.nominal,5000);
  assert.equal(mobile.sourcePage,19);
});

test('selection uses corrected pressure columns and never extrapolates',()=>{
  const values={q:15400,p:200,qmin:0,qmax:0,pmin:0,pmax:0};
  const document={
    getElementById:id=>({value:values[id]})
  };
  const context={window:{models:structuredClone(models)},document,console,Intl};
  context.window.document=document;
  vm.createContext(context);
  for(const file of ['products/registry.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }

  const state=context.window.VensisState;
  state.selectedSeries=new Set(['AXW/ATEX']);
  const target=state.models.find(model=>model.model==='AXW/ATEX 63-4T-3');
  assert.ok(target.points.length>target.sourcePoints.length,'runtime interpolation was not created');

  let selected=context.window.VensisSelection.select().results;
  assert.ok(selected.some(model=>model.model==='AXW/ATEX 63-4T-3'));

  values.q=13500;
  values.p=300;
  selected=context.window.VensisSelection.select().results;
  assert.equal(selected.some(model=>model.model==='AXW/ATEX 63-4T-3'),false);
});
