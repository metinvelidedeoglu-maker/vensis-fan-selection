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

const rows=parseDataFile('fans-10.js');

test('CA MD package adds all products, series, curves and vector points',()=>{
  assert.equal(rows.length,26);
  const seriesCounts={};
  let curves=0;
  let points=0;
  for(const row of rows){
    seriesCounts[row.series]=(seriesCounts[row.series]||0)+1;
    assert.equal(row.brand,'Vortice');
    assert.match(row.key,/^VORTICE-CA-MD\|\d+$/);
    assert.equal(typeof row.productCode,'string');
    assert.ok(row.productCode);
    assert.ok(row.image.startsWith('assets/products/ca-md/'));
    assert.ok(row.dimensionImage.startsWith('assets/products/ca-md/'));
    assert.ok(row.availabilityRegion);
    assert.equal(Object.hasOwn(row,'points'),false,`${row.model} stores generated runtime points`);
    assert.deepEqual(row.operatingPoints.map(point=>point.control),row.curves.map(curve=>curve.control));
    for(const curve of row.curves){
      curves++;
      points+=curve.sourcePoints.length;
      assert.equal(curve.interpolation,'linear');
      assert.equal(curve.precomputed,true);
      assert.equal(curve.sourcePoints.length,21,`${row.model} ${curve.control} point count`);
      for(let index=1;index<curve.sourcePoints.length;index++){
        assert.ok(curve.sourcePoints[index][0]>=curve.sourcePoints[index-1][0],`${row.model} ${curve.control} pressure order`);
      }
    }
  }
  assert.deepEqual(seriesCounts,{'CA MD':9,'CA MD EXTRA EU':8,'CA MD E RF':9});
  assert.equal(curves,66);
  assert.equal(points,1386);
  assert.equal(rows.filter(row=>row.availabilityRegion==='Extra EU').length,8);
  assert.ok(rows.some(row=>row.model==='CA 125 MD E RF'));
  assert.equal(rows.some(row=>row.model==='CA 125 MD E W'),false);

  const deviation=rows.find(row=>row.model==='CA 150 MD E');
  const minCurve=deviation.curves.find(curve=>curve.control==='min');
  const minOperating=deviation.operatingPoints.find(point=>point.control==='min');
  assert.equal(Math.max(...minCurve.sourcePoints.map(point=>point[1])),303.8);
  assert.equal(minOperating.maxAirflowM3h,230);
});

test('CA MD product and dimension images are retained',()=>{
  const imageDirectory=path.join(root,'assets','products','ca-md');
  const images=fs.readdirSync(imageDirectory).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(images,['ca_md.png','ca_md_e_rf.png','dimensions_ca_md.png','dimensions_rf.png']);
  for(const image of images)assert.ok(fs.statSync(path.join(imageDirectory,image)).size>10000,image);
  assert.equal(new Set(rows.map(row=>path.basename(row.image))).size,2);
  assert.equal(new Set(rows.map(row=>path.basename(row.dimensionImage))).size,2);
  assert.ok(fs.statSync(path.join(imageDirectory,'manifest.json')).size>100);
  assert.ok(fs.statSync(path.join(imageDirectory,'validation-report.json')).size>1000);
});

test('catalog keeps 26 CA MD products while selection exposes 66 control curves',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const caCatalog=catalog.models.filter(model=>model.seriesId.startsWith('CA MD'));
  const caSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&model.series.startsWith('CA MD'));

  assert.equal(catalog.models.length,941);
  assert.equal(caCatalog.length,26);
  assert.equal(caSelection.length,66);
  assert.equal(state.models.length,1183);
  assert.deepEqual(
    Object.fromEntries([...state.indexes.seriesCounts].filter(([series])=>series.startsWith('CA MD')).map(([series,ids])=>[series,ids.size])),
    {'CA MD':9,'CA MD EXTRA EU':8,'CA MD E RF':9}
  );

  for(const model of caSelection){
    const points=state.pointsFor(model);
    assert.equal(points,model.points);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
  }
  assert.equal(densifyCount(),0,'CA MD points were regenerated at runtime');

  const vitlo=state.models.find(model=>model.model==='AXW/ATEX 35-4T-0.18');
  assert.ok(vitlo);
  assert.equal(vitlo.points,null);
  state.pointsFor(vitlo);
  assert.equal(densifyCount(),1,'existing Vitlo lazy interpolation changed');
});

test('all three CA MD series select on straight segments without extrapolation',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const targets=[
    state.models.find(model=>model.model==='CA 100 MD'&&model.control==='max'),
    state.models.find(model=>model.model==='CA 100 MD EXTRA EU'&&model.control==='max'),
    state.models.find(model=>model.model==='CA 100 MD E RF'&&model.control==='max')
  ];
  assert.ok(targets.every(Boolean));
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();

  for(const target of targets){
    state.models=[target];
    const first=target.sourcePoints[8];
    const second=target.sourcePoints[9];
    values.p=(first[0]+second[0])/2;
    values.q=(first[1]+second[1])/2;
    let selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,1,target.model);
    assert.ok(Math.abs(selected[0].pp-values.p)<1e-6,target.model);
    assert.ok(Math.abs(selected[0].qq-values.q)<1e-6,target.model);

    const maximumFlow=Math.max(...target.sourcePoints.map(point=>point[1]));
    const endpoint=target.sourcePoints.find(point=>point[1]===maximumFlow);
    values.q=maximumFlow+1;
    values.p=Math.max(endpoint[0],1);
    selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,0,`${target.model} extrapolated`);
  }
});

test('CA MD availability, dimensions and control-specific sound reach product details',()=>{
  const {context,densifyCount}=applicationHarness();
  const state=context.window.VensisState;
  const min=state.models.find(model=>model.model==='CA 100 MD'&&model.control==='min');
  const med=state.models.find(model=>model.model==='CA 100 MD'&&model.control==='med');
  const max=state.models.find(model=>model.model==='CA 100 MD'&&model.control==='max');
  const extra=state.models.find(model=>model.model==='CA 100 MD EXTRA EU'&&model.control==='max');
  const product=context.window.VensisCatalog.product(extra.productKey);
  assert.equal(min.spl,32.3);
  assert.equal(med.spl,0);
  assert.equal(max.spl,43.2);
  assert.equal(product.technical.availabilityRegion,'Extra EU');
  assert.match(product.media.dimensionImage,/dimensions_ca_md\.png$/);

  const before=densifyCount();
  const html=context.window.VensisDatasheet.html({
    mode:'selection',product,model:extra,
    required:{q:200,p:100},selected:{q:200,p:100}
  });
  assert.equal(densifyCount(),before);
  assert.match(html,/Product Code<\/span><b>16107/);
  assert.match(html,/Availability<\/span><b>Extra EU/);
  assert.match(html,/Control Level<\/span><b>max/);
  assert.match(html,/assets\/products\/ca-md\/ca_md\.png/);

  const catalogSource=fs.readFileSync(path.join(root,'js','catalog.js'),'utf8');
  assert.match(catalogSource,/Dimension Drawing/);
  assert.match(catalogSource,/availabilityRegion/);
  assert.match(catalogSource,/point\.sound/);
});

test('every product entry point loads CA MD data and current adapters',()=>{
  for(const file of ['fan-selection.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-10\.js\?v=20260813-ca-md/,file);
    assert.match(html,/products\/registry\.js\?v=20260814-lineo-model-image/,file);
  }
  const selection=fs.readFileSync(path.join(root,'fan-selection.html'),'utf8');
  assert.match(selection,/js\/core\/state\.js\?v=20260813-vortice-batch/);
  const catalog=fs.readFileSync(path.join(root,'catalog.html'),'utf8');
  assert.match(catalog,/js\/catalog\.js\?v=20260813-vortice-batch/);
  assert.match(catalog,/js\/ui\/datasheet\.js\?v=20260825-no-applications-r1/);
  const bootstrap=fs.readFileSync(path.join(root,'api','edit','bootstrap.php'),'utf8');
  assert.match(bootstrap,/'data\/fans-10\.js'/);
});
