import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function parseDataFile(name){
  const text=fs.readFileSync(path.join(root,'data',name),'utf8');
  const match=text.match(/^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  assert.ok(match,`Unsupported data wrapper in ${name}`);
  return JSON.parse(match[1]);
}

function applicationHarness(){
  const values={q:0,p:0,qmin:0,qmax:0,pmin:0,pmax:0};
  const document={getElementById:id=>({value:String(values[id]??0)})};
  const context={window:{models:[]},document,console,Intl};
  context.window.document=document;
  vm.createContext(context);
  for(const file of fs.readdirSync(path.join(root,'data')).filter(name=>/^fans-\d+\.js$/.test(name)).sort()){
    vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),context,{filename:file});
  }
  for(const file of ['data/series-overrides.js','products/registry.js','js/core/utils.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  const originalDensify=context.window.VensisUtils.densifyPoints;
  let densifyCount=0;
  context.window.VensisUtils.densifyPoints=(...args)=>{
    densifyCount++;
    return originalDensify(...args);
  };
  for(const file of ['js/core/state.js','js/core/selection-engine.js','js/ui/datasheet.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  return {context,values,densifyCount:()=>densifyCount};
}

const rows=parseDataFile('fans-11.js');

test('roof package adds every model, control curve and vector point',()=>{
  assert.equal(rows.length,31);
  const seriesCounts={};
  let curves=0;
  let points=0;
  for(const row of rows){
    seriesCounts[row.series]=(seriesCounts[row.series]||0)+1;
    assert.match(row.key,/^VORTICE-ROOF\|\d+$/);
    assert.equal(row.productCode,String(row.productCode));
    assert.equal(Object.hasOwn(row,'points'),false,`${row.model} stores generated runtime points`);
    assert.equal(row.curves.at(-1).control,row.series==='SLIMROOF ES'?'10V':'high');
    assert.deepEqual(row.operatingPoints.map(point=>point.control),row.curves.map(curve=>curve.control));
    for(const curve of row.curves){
      curves++;
      points+=curve.sourcePoints.length;
      assert.equal(curve.interpolation,'linear');
      assert.equal(curve.precomputed,true);
      assert.ok(curve.sourcePoints.length>=16,`${row.model} ${curve.control}`);
      for(let index=1;index<curve.sourcePoints.length;index++){
        assert.ok(curve.sourcePoints[index][0]>=curve.sourcePoints[index-1][0],`${row.model} ${curve.control} pressure order`);
      }
    }
  }
  assert.deepEqual(seriesCounts,{'SLIMROOF ES':10,'HEATMASTER F400':21});
  assert.equal(curves,64);
  assert.equal(points,1334);

  const dual=rows.find(row=>row.model==='HEATMASTER F400 315 T4/T8 0.25/0.03KW');
  assert.deepEqual(dual.curves.map(curve=>curve.control),['low','high']);
  assert.equal(dual.operatingPoints.find(point=>point.control==='low').powerKw,0.03);
  assert.equal(dual.fire,'F400 / 120 min');
  assert.equal(dual.continuousAirTemperatureC,80);
  assert.equal(dual.smokeTemperatureC,400);
});

test('roof product and dimension images are retained with validation assets',()=>{
  const directory=path.join(root,'assets','products','roof-fans');
  const images=fs.readdirSync(directory).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(images,['heatmaster.png','heatmaster_dimensions.png','slimroof.png','slimroof_dimensions.png']);
  for(const image of images)assert.ok(fs.statSync(path.join(directory,image)).size>90000,image);
  assert.ok(fs.statSync(path.join(directory,'manifest.json')).size>100);
  assert.ok(fs.statSync(path.join(directory,'validation-report.json')).size>100);
});

test('catalog keeps 31 roof products while selection exposes 64 controls',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const roofCatalog=catalog.models.filter(model=>['SLIMROOF ES','HEATMASTER F400'].includes(model.seriesId));
  const roofSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&['SLIMROOF ES','HEATMASTER F400'].includes(model.series));

  assert.equal(catalog.models.length,941);
  assert.equal(roofCatalog.length,31);
  assert.equal(roofSelection.length,64);
  assert.equal(state.models.length,1183);
  assert.deepEqual(
    Object.fromEntries([...state.indexes.seriesCounts].filter(([series])=>['SLIMROOF ES','HEATMASTER F400'].includes(series)).map(([series,ids])=>[series,ids.size])),
    {'SLIMROOF ES':10,'HEATMASTER F400':21}
  );
  for(const model of roofSelection){
    assert.equal(state.pointsFor(model),model.points);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
  }
  assert.equal(densifyCount(),0,'roof-fan points were regenerated at runtime');

  const heatmaster=catalog.models.find(model=>model.model==='HEATMASTER F400 315 T2 1.5KW');
  assert.equal(heatmaster.technical.fireRating,'F400 / 120 min');
  assert.equal(heatmaster.technical.continuousAirTemperatureC,80);
  assert.equal(heatmaster.technical.smokeTemperatureC,400);
  assert.equal(heatmaster.technical.smokeDurationMinutes,120);
});

test('SLIMROOF, HEATMASTER and dual-speed curves select linearly without extrapolation',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const targets=[
    state.models.find(model=>model.model==='SLIMROOF 355 T ES'&&model.control==='10V'),
    state.models.find(model=>model.model==='HEATMASTER F400 315 T2 1.5KW'&&model.control==='high'),
    state.models.find(model=>model.model==='HEATMASTER F400 315 T4/T8 0.25/0.03KW'&&model.control==='low')
  ];
  assert.ok(targets.every(Boolean));
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();

  for(const target of targets){
    state.models=[target];
    const first=target.sourcePoints[7];
    const second=target.sourcePoints[8];
    values.p=(first[0]+second[0])/2;
    values.q=(first[1]+second[1])/2;
    let selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,1,target.display);
    assert.ok(Math.abs(selected[0].pp-values.p)<1e-6,target.display);
    assert.ok(Math.abs(selected[0].qq-values.q)<1e-6,target.display);

    const maximumFlow=Math.max(...target.sourcePoints.map(point=>point[1]));
    const endpoint=target.sourcePoints.find(point=>point[1]===maximumFlow);
    values.q=maximumFlow+1;
    values.p=Math.max(endpoint[0],1);
    selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,0,`${target.display} extrapolated`);
  }
});

test('roof datasheets keep separate continuous-air and smoke duties',()=>{
  const {context,densifyCount}=applicationHarness();
  const state=context.window.VensisState;
  const target=state.models.find(model=>model.model==='HEATMASTER F400 315 T4/T8 0.25/0.03KW'&&model.control==='low');
  const product=context.window.VensisCatalog.product(target.productKey);
  const before=densifyCount();
  const html=context.window.VensisDatasheet.html({
    mode:'selection',product,model:target,
    required:{q:800,p:80},selected:{q:800,p:80}
  });
  assert.equal(densifyCount(),before);
  assert.match(html,/Continuous air-temperature limit: 80 °C/);
  assert.match(html,/Emergency smoke duty: F400 \(400 °C \/ 120 minutes\)/);
  assert.match(html,/Fire Rating<\/span><b>F400 \/ 120 min/);
  assert.match(product.media.dimensionImage,/heatmaster_dimensions\.png$/);
});

test('every product entry point loads both new Vortice data chunks',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-11\.js\?v=20260813-vortice-batch/,file);
    assert.match(html,/data\/fans-12\.js\?v=20260813-vortice-batch/,file);
    assert.match(html,/products\/registry\.js\?v=20260813-vortice-batch/,file);
  }
  const bootstrap=fs.readFileSync(path.join(root,'api','edit','bootstrap.php'),'utf8');
  assert.match(bootstrap,/'data\/fans-11\.js'/);
  assert.match(bootstrap,/'data\/fans-12\.js'/);
});
