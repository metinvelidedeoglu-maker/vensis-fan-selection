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

const rows=parseDataFile('fans-12.js');

test('E-ATEX and Tiracamino package retains every model and selection point',()=>{
  assert.equal(rows.length,15);
  assert.deepEqual(
    rows.reduce((counts,row)=>({...counts,[row.series]:(counts[row.series]||0)+1}),{}),
    {'E-ATEX':14,TIRACAMINO:1}
  );
  let points=0;
  for(const row of rows){
    assert.match(row.key,/^VORTICE-EATEX-TIRACAMINO\|\d+$/);
    assert.equal(row.curves.length,1);
    assert.equal(row.curves[0].control,'nominal');
    assert.equal(row.curves[0].interpolation,'linear');
    assert.equal(row.curves[0].precomputed,true);
    assert.equal(Object.hasOwn(row,'points'),false);
    points+=row.curves[0].sourcePoints.length;
  }
  assert.equal(points,1194);

  const eatex=rows.filter(row=>row.series==='E-ATEX');
  assert.ok(eatex.every(row=>row.curves[0].sourceMethod==='digitized from original catalogue vector performance path'));
  assert.ok(eatex.every(row=>row.curveVerification.status==='verified_against_original_catalogue_vector_graphs'));
  assert.ok(eatex.every(row=>row.atex.gas_zone===1&&row.atex.dust_zone===21));
  assert.ok(eatex.every(row=>row.atex.gas_group==='IIB'&&row.atex.dust_group==='IIIC'));
  assert.ok(eatex.every(row=>row.atex.temperature_class==='T3'&&row.atex.max_surface_temperature_c===125));
  assert.ok(eatex.every(row=>row.atex.special_conditions_X===true));
  const tiracamino=rows.find(row=>row.series==='TIRACAMINO');
  assert.equal(tiracamino.gasFireCompatible,false);
  assert.equal(tiracamino.safetyWarning,'Not suitable for gas fires.');
});

test('E-ATEX vectors resolve the normalized-package warning and catalogue heading conflict',()=>{
  const directory=path.join(root,'assets','products','eatex-tiracamino');
  const images=fs.readdirSync(directory).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(images,['eatex.png','eatex_dimensions.png','tiracamino.png','tiracamino_dimensions.png']);
  for(const image of images)assert.ok(fs.statSync(path.join(directory,image)).size>100000,image);
  const validation=JSON.parse(fs.readFileSync(path.join(directory,'validation-report.json'),'utf8'));
  assert.equal(validation.product_count,15);
  assert.equal(validation.warnings.length,1);
  assert.match(validation.warnings[0],/normalized from catalogue endpoints/);

  const verified=JSON.parse(fs.readFileSync(path.join(directory,'verified-vector-curves.json'),'utf8'));
  assert.equal(verified.status,'verified_against_original_catalogue_vector_graphs');
  assert.equal(verified.source_sha256,'7edd786a6a51b40c0a1114bbba1bd04aa67cfa154a9fd1852bb17ce23f37f6ee');
  assert.deepEqual(verified.source_pages,[10,11,12]);
  assert.equal(Object.keys(verified.curves).length,14);
  assert.equal(Object.values(verified.curves).reduce((sum,curve)=>sum+curve.point_count,0),1183);
  assert.ok(Object.values(verified.curves).every(curve=>curve.max_normalized_path_error_percent<0.25));
  assert.match(verified.catalogue_notes.join(' '),/E 506 T and E 606 T graph headings are transposed/);

  const e254=rows.find(row=>row.productCode==='40320');
  const e254Around400=e254.curves[0].sourcePoints.filter(([,airflow])=>airflow>=390&&airflow<=410);
  assert.ok(e254Around400.length>=2);
  assert.ok(e254Around400.every(([pressure])=>pressure>=29&&pressure<=32));

  const e506=rows.find(row=>row.productCode==='40333');
  const e604=rows.find(row=>row.productCode==='40331');
  const e606=rows.find(row=>row.productCode==='40332');
  assert.equal(e506.model,'E 506 T ATEX');
  assert.equal(e506.sourcePage,12);
  assert.equal(Math.max(...e506.curves[0].sourcePoints.map(([pressure])=>pressure)),94);
  assert.equal(Math.max(...e506.curves[0].sourcePoints.map(([,airflow])=>airflow)),3580);
  assert.equal(e604.sourcePage,12);
  assert.equal(e606.model,'E 606 T ATEX');
  assert.equal(e606.sourcePage,11);
  assert.equal(Math.max(...e606.curves[0].sourcePoints.map(([pressure])=>pressure)),113);
  assert.equal(Math.max(...e606.curves[0].sourcePoints.map(([,airflow])=>airflow)),5100);
});

test('catalog and selection expose E-ATEX and Tiracamino as distinct filters',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const packageSeries=new Set(['E-ATEX','TIRACAMINO']);
  const packageCatalog=catalog.models.filter(model=>packageSeries.has(model.seriesId));
  const packageSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&packageSeries.has(model.series));

  assert.equal(catalog.models.length,941);
  assert.equal(packageCatalog.length,15);
  assert.equal(packageSelection.length,15);
  assert.equal(state.models.length,1183);
  assert.ok(state.indexes.series.includes('E-ATEX'));
  assert.ok(state.indexes.series.includes('TIRACAMINO'));
  assert.ok(state.indexes.categories.includes('Explosion-Proof / ATEX Fan'));
  assert.ok(state.indexes.categories.includes('Chimney Fan'));
  for(const model of packageSelection){
    assert.equal(state.pointsFor(model),model.points);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
    assert.equal(model.control,'nominal');
  }
  assert.equal(densifyCount(),0,'E-ATEX/Tiracamino points were regenerated at runtime');
});

test('single-phase, three-phase and Tiracamino curves select without extrapolation',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const targets=[
    state.models.find(model=>model.model==='E 254 M ATEX'),
    state.models.find(model=>model.model==='E 604 T ATEX'),
    state.models.find(model=>model.model==='Tiracamino')
  ];
  assert.ok(targets.every(Boolean));
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();

  for(const target of targets){
    state.models=[target];
    const first=target.sourcePoints[4];
    const second=target.sourcePoints[5];
    values.p=(first[0]+second[0])/2;
    values.q=(first[1]+second[1])/2;
    let selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,1,target.model);
    assert.ok(Math.abs(selected[0].pp-values.p)<1e-6,target.model);
    assert.ok(Math.abs(selected[0].qq-values.q)<1e-6,target.model);

    const maximumFlow=Math.max(...target.sourcePoints.map(point=>point[1]));
    values.q=maximumFlow+1;
    values.p=1;
    selected=context.window.VensisSelection.select().results;
    assert.equal(selected.length,0,`${target.model} extrapolated`);
  }
});

test('ATEX classification and Tiracamino warning reach results, datasheets, projects and quotations',()=>{
  const {context,densifyCount}=applicationHarness();
  const state=context.window.VensisState;
  const eatex=state.models.find(model=>model.model==='E 254 M ATEX');
  const eatexProduct=context.window.VensisCatalog.product(eatex.productKey);
  assert.equal(eatex.hazardousArea.gas_marking,'II 2G Ex h IIB T3 Gb');
  assert.equal(eatex.hazardousArea.dust_marking,'II 2D Ex h IIIC T125°C Db');
  assert.equal(eatex.hazardousArea.special_conditions_X,true);
  assert.match(eatex.safetyWarning,/project classification/);
  assert.equal(eatexProduct.technical.phase,'Single Phase');

  const before=densifyCount();
  const eatexHtml=context.window.VensisDatasheet.html({
    mode:'selection',product:eatexProduct,model:eatex,
    required:{q:500,p:80},selected:{q:500,p:80}
  });
  assert.equal(densifyCount(),before);
  assert.match(eatexHtml,/II 2G Ex h IIB T3 Gb/);
  assert.match(eatexHtml,/II 2D Ex h IIIC T125°C Db/);
  assert.match(eatexHtml,/X special conditions apply/);

  const cards={innerHTML:''};
  context.document.getElementById=id=>id==='cards'?cards:null;
  context.document.querySelector=()=>null;
  context.document.addEventListener=()=>{};
  context.window.addEventListener=()=>{};
  state.results=[{...eatex,qq:500,pp:80,score:0}];
  vm.runInContext(fs.readFileSync(path.join(root,'js','ui','results.js'),'utf8'),context,{filename:'js/ui/results.js'});
  context.window.VensisResults.render();
  assert.match(cards.innerHTML,/II 2G Ex h IIB T3 Gb/);
  assert.match(cards.innerHTML,/II 2D Ex h IIIC T125°C Db/);
  assert.match(cards.innerHTML,/Zone 1\/21/);
  assert.match(cards.innerHTML,/project classification/);

  const tiracamino=state.models.find(model=>model.model==='Tiracamino');
  const tiracaminoProduct=context.window.VensisCatalog.product(tiracamino.productKey);
  const tiracaminoHtml=context.window.VensisDatasheet.html({
    mode:'selection',product:tiracaminoProduct,model:tiracamino,
    required:{q:300,p:100},selected:{q:300,p:100}
  });
  assert.match(tiracaminoHtml,/not suitable for gas fires/i);

  const resultsSource=fs.readFileSync(path.join(root,'js','ui','results.js'),'utf8');
  assert.match(resultsSource,/hazardousAreaSummary/);
  assert.match(resultsSource,/gas_marking/);
  assert.match(resultsSource,/safetyWarning/);
  for(const file of ['js/project.js','js/quotation.js','js/project-print.js']){
    assert.match(fs.readFileSync(path.join(root,file),'utf8'),/safetyWarning/,file);
  }
});

test('new technical adapters use the shared deployment cache version',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(index,/js\/core\/state\.js\?v=20260813-vortice-batch/);
  assert.match(index,/js\/ui\/results\.js\?v=20260813-vortice-batch/);
  assert.match(index,/js\/ui\/datasheet\.js\?v=20260813-vortice-batch/);
  const catalog=fs.readFileSync(path.join(root,'catalog.html'),'utf8');
  assert.match(catalog,/js\/catalog\.js\?v=20260813-vortice-batch/);
  assert.match(catalog,/js\/ui\/datasheet\.js\?v=20260813-vortice-batch/);
  assert.match(fs.readFileSync(path.join(root,'project.html'),'utf8'),/js\/project\.js\?v=20260813-vortice-batch/);
  assert.match(fs.readFileSync(path.join(root,'quotation.html'),'utf8'),/js\/quotation\.js\?v=20260813-vortice-batch/);
  assert.match(fs.readFileSync(path.join(root,'project-print.html'),'utf8'),/js\/project-print\.js\?v=20260813-vortice-batch/);
});
