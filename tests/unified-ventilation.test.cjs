const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function harness(extra=false){
  const values={q:'100',p:'50',qmin:'20',qmax:'20',pmin:'20',pmax:'20'};
  const document={readyState:'loading',documentElement:{lang:'en'},addEventListener(){},querySelectorAll:()=>[],getElementById:id=>({value:values[id]||'0'})};
  const location={href:'https://select.vensis.com.tr/catalog.html',origin:'https://select.vensis.com.tr',pathname:'/catalog.html',search:''};
  const window={document,location,addEventListener(){}};
  const context=vm.createContext({window,document,location,console,Intl,URL,URLSearchParams,localStorage:{getItem:()=> 'en'},setTimeout:()=>0,setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}}});
  const run=file=>vm.runInContext(read(file),context,{filename:file});
  run('data/ventilation-catalog.js');
  if(extra){
    window.VensisVentilationData.series.push({id:'TEST-FOURTH|AXF',code:'AXF',manufacturer:'Fourth Manufacturer',title:'Test fan',categories:['Duct Fan'],description:{general:['Test feature'],motor:['Test motor'],applications:['Test use']},media:{image:'assets/vensis-logo.png'}});
    window.VensisVentilationData.models.push({id:'TEST-FOURTH|1',seriesId:'TEST-FOURTH|AXF',model:'AXF TEST 1',motor:{power:0.1,speed:1000,voltage:'230 V'},media:{image:'assets/vensis-logo.png',dimensionImage:'assets/products/AXF-technical-drawing.webp'},dimensions:{headers:['A','B'],values:{A:123,B:456},unit:'mm'},pricing:{listPrice:123,currency:'EUR'},performance:{nominalAirflow:200,sourcePoints:[[100,0],[50,100],[0,200]],interpolation:'linear',precomputed:true}});
  }
  for(const f of ['products/ventilation.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js','js/ui/datasheet.js','js/ui/pdf-export.js'])run(f);
  return {window,context,values,run};
}
test('all consumers load one catalog and no manufacturer-specific runtime import',()=>{
  for(const file of ['catalog.html','fan-selection.html','project.html','quotation.html','project-print.html']){
    const html=read(file);
    assert.match(html,/products\/ventilation-loader\.js/);
    assert.doesNotMatch(html,/src="(?:data\/(?:fans-|soler-palau|sp-workbook|vortice-workbook|vitlo-)|products\/registry)/);
  }
});
test('every migrated product resolves by its stable ID through the same product API',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  assert.equal(C.models.length,1022);assert.equal(C.series.length,89);
  for(const model of C.models){
    assert.equal(C.getModel(model.id),model);
    const product=C.product(model.id);
    assert.equal(product.id,model.id);assert.equal(product.performance,model.performance);
    assert.equal(product.motor,model.motor);assert.equal(product.pricing,model.pricing);
    assert.ok(C.modelsForSeries(model.seriesId).includes(model));
    assert.equal(w.VensisProducts.fromResult({productKey:model.id}).id,model.id);
  }
});
test('new manufacturer and a duplicate series code use the common registry and preview',()=>{
  const {window:w}=harness(true),C=w.VensisCatalog;
  const s=C.resolveSeries('AXF','fourth-manufacturer');assert.equal(s.id,'TEST-FOURTH|AXF');
  assert.equal(C.resolveSeries('AXF','Vitlo').manufacturer,'Vitlo');
  const model=C.getModel('TEST-FOURTH|1');
  const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
  for(const value of ['Fourth Manufacturer','Test feature','Test motor','Test use','123 mm','456 mm','data-original-catalog-drawing'])assert.ok(html.includes(value),value);
  assert.ok(w.VensisState.models.some(m=>m.productKey===model.id));
});
test('existing manufacturer drawings and dimensions reach the shared preview',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const brand of C.brands){
    const series=new Set(C.series.filter(s=>s.manufacturer===brand.name).map(s=>s.id));
    const model=C.models.find(m=>series.has(m.seriesId)&&m.dimensions);
    assert.ok(model,brand.name);
    const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
    assert.match(html,/<table class="dimension-table">/);
    if(model.media.dimensionImage)assert.ok(html.includes(model.media.dimensionImage));
  }
  const v=C.models.find(m=>m.model==='CA 100 MD EXTRA EU');
  assert.match(w.VensisDirectPreview.html({product:C.product(v.id),model:v}),/dimensions_ca_md\.png/);
});
test('missing data is not replaced by another manufacturer drawing or invented dimensions',()=>{
  const {window:w}=harness();
  const html=w.VensisDirectPreview.html({product:{series:{code:'AXF',manufacturer:'Unknown'},description:{general:[]}},model:{model:'Unknown fan',performance:{}}});
  assert.doesNotMatch(html,/data-original-catalog-drawing|<table class="dimension-table">/);
  assert.match(html,/Performance curve data is not available/);
});
test('all manufacturers retain structured descriptions and model-specific overrides',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const brand of C.brands){
    const series=C.series.find(s=>s.manufacturer===brand.name&&s.description.general.length>1);
    assert.ok(series,brand.name);
    const model=C.modelsForSeries(series.id)[0];
    const html=w.VensisDirectPreview.html({product:C.product(model.id),model});
    assert.ok((html.match(/<li>/g)||[]).length>1,brand.name);
  }
  const stainless=C.getModel('VITLO-CRS-ATEX|CRS/ATEX 31-2T-2|SS316');
  assert.equal(stainless.pricing.listPrice,5750);
  assert.equal(stainless.technicalApprovalRequired,true);
  assert.ok(C.product(stainless.id).description.general.some(x=>/stainless/i.test(x)));
});
test('all performance arrays and price data survive runtime registration unchanged',()=>{
  const {window:w}=harness(),C=w.VensisCatalog;
  for(const source of w.VensisVentilationData.models){
    const m=C.getModel(source.id);
    assert.equal(JSON.stringify(m.performance),JSON.stringify(source.performance),source.id);
    assert.equal(JSON.stringify(m.pricing),JSON.stringify(source.pricing),source.id);
    assert.equal(JSON.stringify(m.motor),JSON.stringify(source.motor),source.id);
  }
  assert.equal(w.VensisState.selectedManufacturers.size,0);
});
test('legacy URLs redirect to the single catalog while retaining query context',()=>{
  for(const file of ['catalog-brand.html','catalog-ventilation.html','catalog-vortice.html','catalog-vortice-stable.html']){
    const html=read(file);assert.match(html,/location\.replace\(target\)/);assert.match(html,/URLSearchParams\(location.search\)/);
    assert.doesNotMatch(html,/VensisCatalogBrand|vortice-manifest-catalog|products\/registry|fileBySeries/);
  }
});
