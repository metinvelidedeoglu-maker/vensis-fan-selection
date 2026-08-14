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
  for(const file of ['data/series-overrides.js','data/vortice-prices-2026-1.js','products/registry.js','js/core/utils.js']){
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

const rows=parseDataFile('fans-09.js');

test('LINEO package adds all products, series, curves and vector points',()=>{
  assert.equal(rows.length,45);
  const seriesCounts={};
  let curves=0;
  let points=0;
  for(const row of rows){
    seriesCounts[row.series]=(seriesCounts[row.series]||0)+1;
    assert.equal(row.brand,'Vortice');
    assert.match(row.key,/^VORTICE-LINEO\|/);
    assert.ok(row.productCode);
    assert.ok(row.image.startsWith('assets/products/lineo/'));
    assert.equal(Object.hasOwn(row,'points'),false,`${row.model} stores generated runtime points`);
    assert.deepEqual(row.operatingPoints.map(point=>point.control),row.curves.map(curve=>curve.control));
    for(const curve of row.curves){
      curves++;
      points+=curve.sourcePoints.length;
      assert.equal(curve.interpolation,'linear');
      assert.equal(curve.precomputed,true);
      assert.ok(curve.sourcePoints.length>=20,`${row.model} ${curve.control} has too few points`);
      for(let index=1;index<curve.sourcePoints.length;index++){
        assert.ok(curve.sourcePoints[index][0]>=curve.sourcePoints[index-1][0],`${row.model} ${curve.control} pressure order`);
      }
    }
  }
  assert.deepEqual(seriesCounts,{
    'LINEO QUIET ES':7,
    'LINEO QUIET':12,
    LINEO:18,
    'LINEO ES':8
  });
  assert.equal(curves,136);
  assert.equal(points,2855);
});

test('all 21 supplied LINEO catalogue images are present and assigned per model',()=>{
  const imageDirectory=path.join(root,'assets','products','lineo');
  const images=fs.readdirSync(imageDirectory).filter(name=>name.endsWith('.png')).sort();
  assert.equal(images.length,21);
  for(const image of images)assert.ok(fs.statSync(path.join(imageDirectory,image)).size>10000,image);
  assert.equal(new Set(rows.map(row=>path.basename(row.image))).size,21);
  assert.notEqual(
    rows.find(row=>row.model==='LINEO 100')?.image,
    rows.find(row=>row.model==='LINEO 315')?.image
  );
});

test('catalog keeps 45 LINEO products while selection exposes 136 control curves',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const lineoCatalog=catalog.models.filter(model=>model.seriesId.startsWith('LINEO'));
  const lineoSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&model.series.startsWith('LINEO'));

  assert.equal(catalog.models.length,941);
  assert.equal(lineoCatalog.length,45);
  assert.equal(lineoSelection.length,136);
  assert.equal(state.models.length,1183);
  assert.deepEqual(
    Object.fromEntries([...state.indexes.seriesCounts].filter(([series])=>series.startsWith('LINEO')).map(([series,ids])=>[series,ids.size])),
    {'LINEO QUIET ES':7,'LINEO QUIET':12,LINEO:18,'LINEO ES':8}
  );

  for(const model of lineoSelection){
    const points=state.pointsFor(model);
    assert.equal(points,model.points);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
  }
  assert.equal(densifyCount(),0,'LINEO points were regenerated at runtime');

  const vitlo=state.models.find(model=>model.model==='AXW/ATEX 35-4T-0.18');
  assert.ok(vitlo);
  assert.equal(vitlo.points,null);
  state.pointsFor(vitlo);
  assert.equal(densifyCount(),1,'existing Vitlo lazy interpolation changed');
});

test('LINEO selection uses straight segments and does not extrapolate',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const target=state.models.find(model=>model.model==='LINEO 100 ES'&&model.control==='10V');
  assert.ok(target);
  state.models=[target];
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();

  const first=target.sourcePoints[8];
  const second=target.sourcePoints[9];
  values.p=(first[0]+second[0])/2;
  values.q=(first[1]+second[1])/2;
  let selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,1);
  assert.ok(Math.abs(selected[0].pp-values.p)<1e-6);
  assert.ok(Math.abs(selected[0].qq-values.q)<1e-6);

  const maximumFlow=Math.max(...target.sourcePoints.map(point=>point[1]));
  const endpoint=target.sourcePoints.find(point=>point[1]===maximumFlow);
  values.q=maximumFlow+1;
  values.p=endpoint[0];
  selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,0);
});

test('LINEO datasheet shows control levels without creating new curve points',()=>{
  const {context,densifyCount}=applicationHarness();
  const state=context.window.VensisState;
  const target=state.models.find(model=>model.model==='LINEO 150 QUIET ES'&&model.control==='10V');
  const product=context.window.VensisCatalog.product(target.productKey);
  const before=densifyCount();
  const html=context.window.VensisDatasheet.html({
    mode:'selection',product,model:target,
    required:{q:300,p:100},selected:{q:300,p:100}
  });
  assert.equal(densifyCount(),before);
  assert.match(html,/Product Code<\/span><b>17172/);
  assert.match(html,/Control Level<\/span><b>10V/);
  assert.match(html,/Available Controls<\/span><b>4V \/ 6V \/ 8V \/ 10V/);
  assert.match(html,/assets\/products\/lineo\/quiet_es_150\.png/);
});

test('every product entry point loads the LINEO data and current adapters',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-09\.js\?v=20260813-lineo/,file);
    assert.match(html,/products\/registry\.js\?v=20260814-vortice-prices/,file);
  }
  const selection=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(selection,/js\/core\/selection-engine\.js\?v=20260813-lineo/);
  const bootstrap=fs.readFileSync(path.join(root,'api','edit','bootstrap.php'),'utf8');
  assert.match(bootstrap,/'data\/fans-09\.js'/);
});
