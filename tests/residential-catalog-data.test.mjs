import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const residentialDirectory=path.join(root,'assets','products','vortice-residential');
const selectedSeries=[
  'PUNTO','PUNTO FILO','PUNTO FOUR','PUNTO GHOST','PUNTO EVO FLEXO','PUNTO EVO',
  'PUNTO EVO ES','PUNTO EVO GOLD','VORTICE VARIO','VORTICE VARIO I',
  'VORT QUADRO','VORT QUADRO I','VORT QUADRO EVO'
];
const excludedSeries=['ARIETT','ARIETT HABITAT','ARIETT I','VORT PRESS','VORT PRESS HABITAT','VORT PRESS I'];

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

function pngDimensions(file){
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(1,4).toString(),'PNG',path.basename(file));
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

const rows=parseDataFile('fans-13.js');

test('selected residential package retains all 172 configurations and 243 catalogue curves',()=>{
  const expectedCounts={
    PUNTO:49,'PUNTO FILO':21,'PUNTO FOUR':6,'PUNTO GHOST':11,'PUNTO EVO FLEXO':6,
    'PUNTO EVO':10,'PUNTO EVO ES':2,'PUNTO EVO GOLD':8,'VORTICE VARIO':10,
    'VORTICE VARIO I':6,'VORT QUADRO':11,'VORT QUADRO I':9,'VORT QUADRO EVO':23
  };
  const counts={};
  let curves=0;
  let points=0;

  assert.equal(rows.length,172);
  assert.equal(new Set(rows.map(row=>row.key)).size,172);
  assert.equal(new Set(rows.map(row=>row.configurationId)).size,172);
  for(const row of rows){
    counts[row.series]=(counts[row.series]||0)+1;
    assert.equal(row.brand,'Vortice');
    assert.match(row.key,/^VORTICE-RESIDENTIAL\|/);
    assert.ok(row.configurationId);
    assert.equal(Object.hasOwn(row,'points'),false,`${row.model} stores generated runtime points`);
    assert.deepEqual(row.operatingPoints.map(point=>point.control),row.curves.map(curve=>curve.control));
    for(const curve of row.curves){
      curves++;
      points+=curve.sourcePoints.length;
      assert.equal(curve.interpolation,'linear');
      assert.equal(curve.precomputed,true);
      assert.match(curve.sourceMethod,/axis-calibrated from original catalogue vector performance path/);
      assert.ok(curve.sourcePoints.length>=29,`${row.model} ${curve.control} has too few vector points`);
    }
  }
  assert.deepEqual(counts,expectedCounts);
  assert.equal(curves,243);
  assert.equal(points,23643);
  assert.deepEqual([...new Set(rows.map(row=>row.series))],selectedSeries);
  assert.ok(excludedSeries.every(series=>!rows.some(row=>row.series===series)));

  for(const code of ['11203','11223']){
    const shared=rows.filter(row=>row.productCode===code);
    assert.equal(shared.length,2,code);
    assert.equal(new Set(shared.map(row=>row.key)).size,2,code);
    assert.equal(new Set(shared.map(row=>row.configurationId)).size,2,code);
  }
});

test('original residential vectors replace normalized approximations and restore omitted speeds',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(residentialDirectory,'manifest.json'),'utf8'));
  const validation=JSON.parse(fs.readFileSync(path.join(residentialDirectory,'validation-report.json'),'utf8'));
  const verified=JSON.parse(fs.readFileSync(path.join(residentialDirectory,'verified-vector-curves.json'),'utf8'));

  assert.equal(manifest.expected_products,172);
  assert.equal(manifest.expected_curves,228);
  assert.equal(manifest.expected_curve_points,4788);
  assert.equal(validation.total_curves,228);
  assert.equal(validation.total_curve_points,4788);
  assert.deepEqual(validation.excluded_ranges,excludedSeries);
  assert.match(validation.warnings.join(' '),/normalized from catalogue operating endpoints/);

  assert.equal(verified.status,'verified_against_original_catalogue_vector_graphs');
  assert.equal(verified.source_sha256,'45a3f2edd581a3917510b83cc84ce5de33b9d74648f34f7f4b63199a342be6f7');
  assert.deepEqual(verified.source_pages,[9,14,18,22,27,32,36,40,43,44,51,52,86,92,101]);
  assert.deepEqual(verified.summary,{
    products:172,series:13,graphs:45,curves:243,points:23643,
    maximum_normalized_path_error_percent:0.4259
  });
  const errors=Object.values(verified.graphs).flatMap(graph=>
    Object.values(graph.curves).map(curve=>curve.max_normalized_path_error_percent)
  );
  assert.ok(errors.every(error=>error<0.5));
  assert.match(verified.catalogue_notes.join(' '),/increasing the selected residential curve count from 228 to 243/);

  const punto=rows.find(row=>row.productCode==='11201');
  const stallStart=punto.curves[0].sourcePoints.findIndex(([pressure,airflow])=>pressure===11&&airflow===47);
  assert.ok(stallStart>=0);
  assert.deepEqual(punto.curves[0].sourcePoints.slice(stallStart,stallStart+3),[[11,47],[11.6,50.4],[12.4,54]]);

  const varioStandard=rows.find(row=>row.productCode==='12611');
  const varioLongLife=rows.find(row=>row.productCode==='14615');
  assert.deepEqual(varioStandard.curves[0].sourcePoints[0],[25,0]);
  assert.deepEqual(varioStandard.curves[0].sourcePoints.at(-1),[0,235]);
  assert.deepEqual(varioLongLife.curves[0].sourcePoints[0],[62,0]);
  assert.deepEqual(varioLongLife.curves[0].sourcePoints.at(-1),[0,379.8]);

  assert.deepEqual(rows.find(row=>row.model==='MICRO 100 I').curves.map(curve=>curve.control),['speed_1','speed_2','speed_3','speed_4']);
  assert.deepEqual(rows.find(row=>row.model==='MEDIO').curves.map(curve=>curve.control),['min','med','max']);
  assert.deepEqual(rows.find(row=>row.model==='MEDIO I').curves.map(curve=>curve.control),['min','med','max']);
});

test('catalog and selector expose the residential ranges without regenerating vectors',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const selectedSet=new Set(selectedSeries);
  const residentialCatalog=catalog.models.filter(model=>selectedSet.has(model.seriesId));
  const residentialSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&selectedSet.has(model.series));

  assert.equal(catalog.models.length,941);
  assert.equal(residentialCatalog.length,172);
  assert.equal(state.models.length,1183);
  assert.equal(residentialSelection.length,243);
  assert.ok(selectedSeries.every(series=>state.indexes.series.includes(series)));
  assert.ok(excludedSeries.every(series=>!state.indexes.series.includes(series)));
  assert.ok(state.indexes.categories.includes('Residential Fan'));
  assert.deepEqual(
    Object.fromEntries([...state.indexes.seriesCounts].filter(([series])=>selectedSet.has(series)).map(([series,ids])=>[series,ids.size])),
    {
      PUNTO:49,'PUNTO FILO':21,'PUNTO FOUR':6,'PUNTO GHOST':11,'PUNTO EVO FLEXO':6,
      'PUNTO EVO':10,'PUNTO EVO ES':2,'PUNTO EVO GOLD':8,'VORTICE VARIO':10,
      'VORTICE VARIO I':6,'VORT QUADRO':11,'VORT QUADRO I':9,'VORT QUADRO EVO':23
    }
  );

  for(const model of residentialSelection){
    assert.equal(state.pointsFor(model),model.points);
    assert.equal(model.points,model.sourcePoints);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
  }
  assert.equal(densifyCount(),0,'residential vectors were regenerated at runtime');
});

test('stall-region path order survives registry loading and selects on the real segment',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const target=state.models.find(model=>model.productKey==='VORTICE-RESIDENTIAL|PUNTO:11201:M 100/4'&&model.control==='nominal');
  assert.ok(target);
  const stallStart=target.sourcePoints.findIndex(([pressure,airflow])=>pressure===11&&airflow===47);
  assert.ok(stallStart>=0);
  assert.equal(target.sourcePoints[stallStart+1][0],11.6,'stall pressure rise was reordered');
  assert.equal(target.sourcePoints[stallStart+1][1],50.4,'stall airflow path was reordered');

  state.models=[target];
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();
  values.q=(47+50.4)/2;
  values.p=(11+11.6)/2;
  let selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,1);
  assert.ok(Math.abs(selected[0].qq-values.q)<1e-6);
  assert.ok(Math.abs(selected[0].pp-values.p)<1e-6);

  values.q=Math.max(...target.sourcePoints.map(point=>point[1]))+1;
  values.p=8;
  selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,0,'residential curve extrapolated');
});

test('residential feature flags and images reach product details',()=>{
  const {context}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const byCode=code=>catalog.models.find(model=>model.technical.productCode===code);

  assert.equal(byCode('11211').technical.timerVariant,true);
  assert.equal(byCode('11616').technical.humiditySensor,true);
  assert.equal(byCode('11681').technical.presenceSensor,true);
  assert.equal(byCode('11202').technical.longLife,true);
  assert.equal(byCode('12612').technical.reversible,true);
  assert.match(byCode('11201').media.dimensionImage,/punto_dimensions\.png$/);

  const catalogSource=fs.readFileSync(path.join(root,'js','catalog.js'),'utf8');
  for(const label of ['Timer','Humidity Sensor','Presence Sensor','Long-Life Motor','Reversible']){
    assert.match(catalogSource,new RegExp(label));
  }

  const expectedImages=selectedSeries.flatMap(series=>{
    const stem={
      PUNTO:'punto','PUNTO FILO':'punto_filo','PUNTO FOUR':'punto_four','PUNTO GHOST':'punto_ghost',
      'PUNTO EVO FLEXO':'punto_evo_flexo','PUNTO EVO':'punto_evo','PUNTO EVO ES':'punto_evo_es',
      'PUNTO EVO GOLD':'punto_evo_gold','VORTICE VARIO':'vortice_vario','VORTICE VARIO I':'vortice_vario_i',
      'VORT QUADRO':'vort_quadro','VORT QUADRO I':'vort_quadro_i','VORT QUADRO EVO':'vort_quadro_evo'
    }[series];
    return [`${stem}.png`,`${stem}_dimensions.png`];
  }).sort();
  const images=fs.readdirSync(residentialDirectory).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(images,expectedImages);
  assert.equal(new Set(rows.map(row=>path.basename(row.image))).size,13);
  assert.equal(new Set(rows.map(row=>path.basename(row.dimensionImage))).size,13);
  for(const image of images){
    const file=path.join(residentialDirectory,image);
    assert.ok(fs.statSync(file).size>3000,image);
    const dimensions=pngDimensions(file);
    assert.ok(dimensions.width>=200&&dimensions.height>=170,`${image} dimensions`);
  }
});

test('every product entry point and editor bootstrap load the residential data chunk',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-13\.js\?v=20260813-vortice-batch/,file);
    assert.match(html,/products\/registry\.js\?v=20260814-vortice-prices/,file);
  }
  const bootstrap=fs.readFileSync(path.join(root,'api','edit','bootstrap.php'),'utf8');
  assert.match(bootstrap,/'data\/fans-13\.js'/);
});
