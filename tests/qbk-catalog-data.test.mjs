import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qbkDirectory=path.join(root,'assets','products','qbk-sal-kc-evo');

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

const rows=parseDataFile('fans-14.js');

test('QBK package retains codes 43151-43171 and every verified control curve',()=>{
  let curves=0;
  let points=0;
  assert.equal(rows.length,21);
  assert.deepEqual(rows.map(row=>Number(row.productCode)),Array.from({length:21},(_,index)=>43151+index));
  assert.equal(new Set(rows.map(row=>row.key)).size,21);

  for(const row of rows){
    assert.equal(row.brand,'Vortice');
    assert.equal(row.series,'VORT QBK SAL-KC EVO');
    assert.match(row.key,/^VORTICE-QBK-SAL-KC-EVO\|43\d{3}$/);
    assert.equal(Object.hasOwn(row,'points'),false,`${row.model} stores generated runtime points`);
    assert.deepEqual(row.operatingPoints.map(point=>point.control),row.curves.map(curve=>curve.control));
    for(const curve of row.curves){
      curves++;
      points+=curve.sourcePoints.length;
      assert.equal(curve.interpolation,'linear');
      assert.equal(curve.precomputed,true);
      assert.match(curve.sourceMethod,/axis-calibrated from original catalogue vector performance path/);
      assert.ok(curve.sourcePoints.length>=40,`${row.model} ${curve.control} has too few vector points`);
    }
  }
  assert.equal(curves,28);
  assert.equal(points,2216);
  assert.equal(rows.filter(row=>row.curves.length===2).length,7);
  assert.ok(rows.slice(0,14).every(row=>row.curves.map(curve=>curve.control).join(',')==='nominal'));
  assert.ok(rows.slice(14).every(row=>row.curves.map(curve=>curve.control).join(',')==='8_poles,4_poles'));
});

test('QBK vectors correct the transfer package axis-origin shift',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(qbkDirectory,'manifest.json'),'utf8'));
  const validation=JSON.parse(fs.readFileSync(path.join(qbkDirectory,'validation-report.json'),'utf8'));
  const verified=JSON.parse(fs.readFileSync(path.join(qbkDirectory,'verified-vector-curves.json'),'utf8'));

  assert.equal(manifest.product_count,21);
  assert.equal(validation.status,'pass');
  assert.equal(validation.total_curves,28);
  assert.equal(validation.total_curve_points,866);
  assert.match(validation.notes.join(' '),/linear interpolation only/i);

  assert.equal(verified.status,'verified_against_original_catalogue_vector_graphs');
  assert.equal(verified.source_sha256,'892f4e1efad05a5179120f4f2099518649198c64ee6641c0623dc3f5e198e766');
  assert.deepEqual(verified.source_pages,[10,11,12,13]);
  assert.deepEqual(verified.summary,{
    products:21,series:1,curves:28,points:2216,
    maximum_normalized_path_error_percent:0.0367
  });
  assert.match(verified.catalogue_notes.join(' '),/incorrect graph-axis origins/);
  const verifiedCurves=Object.values(verified.curves).flatMap(product=>Object.values(product.curves));
  assert.equal(verifiedCurves.length,28);
  assert.equal(verifiedCurves.reduce((sum,curve)=>sum+curve.point_count,0),2216);
  assert.ok(verifiedCurves.every(curve=>curve.max_normalized_path_error_percent<0.05));

  const largest=rows.find(row=>row.productCode==='43171');
  const eightPoles=largest.curves.find(curve=>curve.control==='8_poles');
  const fourPoles=largest.curves.find(curve=>curve.control==='4_poles');
  assert.deepEqual(eightPoles.sourcePoints[0],[347.7,1106.2]);
  assert.deepEqual(eightPoles.sourcePoints.at(-1),[19.2,11039.8]);
  assert.deepEqual(fourPoles.sourcePoints[0],[1402.9,2190.3]);
  assert.deepEqual(fourPoles.sourcePoints.at(-1),[86.3,22035.4]);
  assert.equal(Math.max(...fourPoles.sourcePoints.map(point=>point[1])),22079.7);
  assert.deepEqual(fourPoles.sourcePoints.slice(-5),[
    [81.5,22057.5],[79.1,22079.7],[81.5,22079.7],[83.9,22057.5],[86.3,22035.4]
  ]);
});

test('catalog keeps 21 QBK products while selection exposes 28 controls',()=>{
  const {context,densifyCount}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const state=context.window.VensisState;
  const qbkCatalog=catalog.models.filter(model=>model.seriesId==='VORT QBK SAL-KC EVO');
  const qbkSelection=state.models.filter(model=>model.manufacturer==='Vortice'&&model.series==='VORT QBK SAL-KC EVO');

  assert.equal(catalog.models.length,941);
  assert.equal(qbkCatalog.length,21);
  assert.equal(state.models.length,1183);
  assert.equal(qbkSelection.length,28);
  assert.ok(state.indexes.series.includes('VORT QBK SAL-KC EVO'));
  assert.ok(state.indexes.categories.includes('Cabinet Fan'));
  assert.equal(state.indexes.seriesCounts.get('VORT QBK SAL-KC EVO').size,21);

  for(const model of qbkSelection){
    assert.equal(state.pointsFor(model),model.points);
    assert.equal(model.points,model.sourcePoints);
    assert.equal(model.interpolation,'linear');
    assert.equal(model.precomputed,true);
  }
  assert.equal(densifyCount(),0,'QBK vectors were regenerated at runtime');

  const eightPoles=qbkSelection.find(model=>model.productKey.endsWith('|43171')&&model.control==='8_poles');
  const fourPoles=qbkSelection.find(model=>model.productKey.endsWith('|43171')&&model.control==='4_poles');
  assert.equal(eightPoles.kw,1.1);
  assert.equal(fourPoles.kw,5.5);
});

test('QBK path order and linear segments survive selection without extrapolation',()=>{
  const {context,values}=applicationHarness();
  const state=context.window.VensisState;
  const target=state.models.find(model=>model.productKey.endsWith('|43171')&&model.control==='4_poles');
  assert.ok(target);
  assert.deepEqual(Array.from(target.sourcePoints.slice(-5),point=>Array.from(point)),[
    [81.5,22057.5],[79.1,22079.7],[81.5,22079.7],[83.9,22057.5],[86.3,22035.4]
  ]);

  state.models=[target];
  state.selectedManufacturers.clear();
  state.selectedCategories.clear();
  state.selectedSeries.clear();
  const first=target.sourcePoints[20];
  const second=target.sourcePoints[21];
  values.p=(first[0]+second[0])/2;
  values.q=(first[1]+second[1])/2;
  let selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,1);
  assert.ok(Math.abs(selected[0].pp-values.p)<1e-6);
  assert.ok(Math.abs(selected[0].qq-values.q)<1e-6);

  values.q=Math.max(...target.sourcePoints.map(point=>point[1]))+1;
  values.p=80;
  selected=context.window.VensisSelection.select().results;
  assert.equal(selected.length,0,'QBK curve extrapolated');
});

test('QBK technical data, dimensions and images reach the product catalog',()=>{
  const {context}=applicationHarness();
  const catalog=context.window.VensisCatalog;
  const model=catalog.models.find(item=>item.id==='VORTICE-QBK-SAL-KC-EVO|43171');
  const product=catalog.product(model.id);

  assert.equal(model.motor.power,5.5);
  assert.equal(model.technical.productCode,'43171');
  assert.equal(model.technical.phase,'Three Phase');
  assert.equal(model.technical.poles,4);
  assert.equal(model.technical.nominalDuctMm,630);
  assert.equal(model.technical.maxAmbientC,120);
  assert.equal(model.technical.ipClass,'IP55');
  assert.equal(model.technical.insulationClass,'F');
  assert.equal(model.technical.motorType,'T4/8');
  assert.deepEqual({...model.technical.dimensions},{A:1120,B:1120,C:1060,D:708,E:1182,F:810,G:1232});
  assert.equal(model.source.page,13);
  assert.match(product.media.image,/qbk_sal_kc_evo\.png$/);
  assert.match(product.media.dimensionImage,/qbk_sal_kc_evo_dimensions\.png$/);

  const images=fs.readdirSync(qbkDirectory).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(images,['qbk_sal_kc_evo.png','qbk_sal_kc_evo_dimensions.png']);
  for(const image of images){
    const file=path.join(qbkDirectory,image);
    assert.ok(fs.statSync(file).size>30000,image);
    const dimensions=pngDimensions(file);
    assert.ok(dimensions.width>=400&&dimensions.height>=375,`${image} dimensions`);
  }
});

test('every product entry point and editor bootstrap load the QBK data chunk',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/data\/fans-14\.js\?v=20260813-vortice-batch/,file);
    assert.match(html,/products\/registry\.js\?v=20260814-vortice-prices/,file);
  }
  const bootstrap=fs.readFileSync(path.join(root,'api','edit','bootstrap.php'),'utf8');
  assert.match(bootstrap,/'data\/fans-14\.js'/);
});
