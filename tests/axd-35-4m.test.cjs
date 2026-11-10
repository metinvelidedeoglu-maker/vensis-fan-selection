const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const extension='data/ventilation-axd-35-4m-addition.js';
const id='AXD|AXD 35-4M-0.18|2860|27';
const plain=value=>JSON.parse(JSON.stringify(value));
function load(){
  const inputs={q:2300,p:50,qmin:0,qmax:0,pmin:0,pmax:0};
  const document={getElementById:key=>({value:String(inputs[key]||0)}),querySelectorAll:()=>[],addEventListener(){}};
  const window={document};
  const context=vm.createContext({window,document,console});
  const run=file=>vm.runInContext(read(file),context,{filename:file});
  run('data/ventilation-catalog.js');
  return {window,run};
}
test('new AXD is one standard duct single-phase model at EUR 600, preserving existing records',()=>{
  const {window:w,run}=load(),d=w.VensisVentilationData;
  const before=plain(d.models),seriesBefore=plain(d.series);
  run(extension);
  const m=d.models.find(m=>m.id===id),base=before.find(m=>m.model==='AXD 35-4T-0.18');
  assert.ok(m);assert.equal(d.models.length,before.length+1);
  assert.deepEqual(plain(d.models.filter(m=>m.id!==id)),before);
  const expectedSeries=plain(d.series);expectedSeries.find(s=>s.id==='AXD').modelIds=expectedSeries.find(s=>s.id==='AXD').modelIds.filter(key=>key!==id);
  assert.deepEqual(expectedSeries,seriesBefore);
  assert.equal(m.model,'AXD 35-4M-0.18');assert.equal(m.seriesId,'AXD');
  assert.equal(m.technical.phase,'Single-phase');assert.equal(m.technical.poles,4);
  assert.equal(m.motor.voltage,'230V');assert.equal(m.motor.frequency,'50 Hz');
  assert.equal(m.motor.current,0);assert.equal(m.technical.mountType,'Duct');
  assert.equal(m.technical.productGroup,'Axial Fan');assert.equal(m.technical.atex,null);
  assert.deepEqual(plain(m.pricing),{listPrice:600,currency:'EUR'});
  assert.deepEqual(plain(m.dimensions),base.dimensions);assert.deepEqual(plain(m.media),base.media);
  assert.deepEqual(plain(m.performance),base.performance);
  assert.equal(m.verification.status,'catalog-derived');assert.equal(m.verification.derivation.notAtex,true);
  assert.doesNotMatch(JSON.stringify(m.description),/400\s*V|frequency converter|ATEX/i);
  assert.match(JSON.stringify(m.description),/Single-phase 230 V/);
  run(extension);assert.equal(d.models.length,before.length+1);
});
test('AXD participates in actual selection and product routes without ATEX badges',()=>{
  const {window:w,run}=load();run(extension);
  for(const f of ['products/ventilation.js','js/catalog-feature-tags.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js'])run(f);
  const model=w.VensisCatalog.getModel(id);
  assert.equal(w.VensisCatalog.modelSlug(model),'axd-35-4m-0-18');
  assert.ok(!w.VensisCatalogFeatureTags(model,'en').includes('ATEX'));
  const match=w.VensisSelection.select().results.find(m=>m.productKey===id);
  assert.ok(match);assert.equal(match.price,600);assert.equal(match.voltage,'230V');
  assert.ok(Math.abs(match.qq-2300)<1e-5);assert.ok(Math.abs(match.pp-50)<1e-5);
  assert.ok(read('products/ventilation-loader.js').includes(extension));
  assert.ok(read('api/agent/domain.php').includes('agent_catalog_add_axd_35_4m'));
});
test('the AXD addition stops when its independently compared curves disagree',()=>{
  const {window:w,run}=load(),d=w.VensisVentilationData;
  d.models.find(m=>m.model==='AXW/ATEX 35-4M-0.18').performance.sourcePoints[0][1]=999;
  run(extension);assert.ok(!d.models.some(m=>m.id===id));
});
