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
const vitloModels=models.filter(model=>model.brand==='Vitlo');

test('catalog contains only verified Vitlo product rows',()=>{
  assert.equal(vitloModels.length,631);
  const expectedCounts={
    AXF:48,'BOX-AXF':48,'AXW/ATEX':32,'AXD/ATEX':42,'MOB-AXD/ATEX':9,
    'AXR/ATEX':24,'CRH/ATEX':8,'CRD/ATEX':8,'CRS/ATEX':8,AXD:56,
    'AXD/MOB':10,AXS:56,AXW:24,AXB:17,AXH:56,CD:6,CRB:9,CRD:8,
    CRK:8,CRC:9,CRS:8,CR:9,CRH:8,CRV:8,CRU:9,AXR:24,AXV:24,
    VHR:6,CRR:6,AXJ:4,'TUNEL-AXF':15,'CR-EC':6,'CRU-EC':6,
    'CRB-EC':6,'CRC-EC':6
  };
  const actualCounts={};
  for(const model of vitloModels)actualCounts[model.series]=(actualCounts[model.series]||0)+1;
  assert.deepEqual(actualCounts,expectedCounts);
  assert.equal(vitloModels.some(model=>Number(model.kw)===0),false);
});

test('only verified catalogue points are stored',()=>{
  let rawCurveCount=0;
  for(const model of vitloModels){
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
  assert.equal(rawCurveCount,588);
});

test('AXW/ATEX includes the supplied two-pole models',()=>{
  const expected=[
    ['AXW/ATEX 35-2T-0.37',4000,0.25,2770,0.7,78,1316,[[100,3400],[150,3000],[200,2550],[250,2000],[300,1200]]],
    ['AXW/ATEX 35-2T-0.55',4600,0.37,2770,1.2,80,1352,[[100,4000],[150,3600],[200,3100],[250,2500],[300,1600]]],
    ['AXW/ATEX 35-2T-0.75',5000,0.55,2770,1.45,82,1387,[[100,4700],[150,4450],[200,4150],[250,3830],[300,3500],[350,3000]]],
    ['AXW/ATEX 40-2T-1',6500,0.75,2880,1.76,85,1529,[[100,6000],[150,5750],[200,5500],[250,5200],[300,4840],[350,4370],[400,3850]]],
    ['AXW/ATEX 40-2T-1.5',7820,1.1,2870,2.52,85,1636,[[100,7370],[150,7050],[200,6770],[250,6400],[300,6000],[350,5500],[400,5150],[500,3500]]],
    ['AXW/ATEX 45-2T-2',11000,1.5,2870,3.13,88,1888,[[100,10300],[150,9900],[200,9500],[250,9120],[300,8670],[350,8170],[400,7600],[500,5850]]],
    ['AXW/ATEX 50-2T-3',14000,2.2,2875,4.45,86,2062,[[100,13000],[150,12700],[200,12300],[250,11700],[300,11200],[350,10700],[400,10000],[500,8540],[600,6130]]],
    ['AXW/ATEX 56-2T-4',17600,3,2900,5.77,95,2456,[[100,16600],[150,16200],[200,15700],[250,15200],[300,14600],[350,14000],[400,13400],[500,11800],[600,9500],[700,6700]]],
  ];

  for(const [name,nominal,kw,rpm,amps,spl,price,sourcePoints] of expected){
    const model=models.find(row=>row.model===name);
    assert.ok(model,`${name} is missing`);
    assert.equal(model.series,'AXW/ATEX');
    assert.equal(model.brand,'Vitlo');
    assert.equal(model.atex,true);
    assert.equal(model.pole,2);
    assert.equal(model.voltage,'400V-50Hz');
    assert.equal(model.sourcePage,15);
    assert.deepEqual(
      [model.nominal,model.kw,model.rpm,model.amps,model.spl,model.price,model.sourcePoints],
      [nominal,kw,rpm,amps,spl,price,sourcePoints]
    );
  }
});

test('all product entry points load the supplied AXW/ATEX data chunk',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-08\.js\?v=20260812-axw-atex-2t/,file);
  }
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
  const untouched=state.models.find(model=>model.model==='AXD 35-4T-0.18');
  assert.equal(target.points,null,'runtime interpolation happened during page initialization');
  assert.equal(untouched.points,null,'an unrelated curve was initialized eagerly');

  let selected=context.window.VensisSelection.select().results;
  assert.ok(target.points.length>target.sourcePoints.length,'runtime interpolation was not created on demand');
  assert.equal(untouched.points,null,'a model outside the active filters was interpolated');
  const cachedPoints=target.points;
  context.window.VensisSelection.select();
  assert.equal(target.points,cachedPoints,'runtime interpolation was not cached');
  assert.ok(selected.some(model=>model.model==='AXW/ATEX 63-4T-3'));

  values.q=13500;
  values.p=300;
  selected=context.window.VensisSelection.select().results;
  assert.equal(selected.some(model=>model.model==='AXW/ATEX 63-4T-3'),false);
});

test('catalog datasheets interpolate and cache only the requested curve',()=>{
  const document={getElementById:()=>null};
  const context={window:{},document,console,Intl};
  context.window.document=document;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'js/core/utils.js'),'utf8'),context,{filename:'js/core/utils.js'});

  const original=context.window.VensisUtils.densifyPoints;
  let interpolationCount=0;
  context.window.VensisUtils.densifyPoints=(...args)=>{
    interpolationCount++;
    return original(...args);
  };
  vm.runInContext(fs.readFileSync(path.join(root,'js/ui/datasheet.js'),'utf8'),context,{filename:'js/ui/datasheet.js'});
  assert.equal(interpolationCount,0,'datasheet curves were initialized before use');

  const sourcePoints=[[0,2860],[25,2600],[50,2300],[75,2000],[100,1500]];
  const payload={
    mode:'catalog',
    model:{model:'AXW/ATEX 35-4T-0.18',performance:{nominalAirflow:2860,points:[],sourcePoints}},
    product:{series:{title:'AXW/ATEX',manufacturer:'Vitlo'},description:{general:[],motor:[],applications:[]}}
  };
  const first=context.window.VensisDatasheet.html(payload);
  assert.equal(interpolationCount,1,'requested catalog curve was not interpolated');
  assert.match(first,/Fan Performance Curve/);
  context.window.VensisDatasheet.html(payload);
  assert.equal(interpolationCount,1,'requested catalog curve was not cached');
});
