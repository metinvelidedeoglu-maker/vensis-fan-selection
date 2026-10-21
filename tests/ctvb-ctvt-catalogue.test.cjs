const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const rows=[
 ['CTVB/4-180',1310,.073,.3,870,49,11.7,200,false],
 ['CTVB/4-225',1400,.166,.7,1910,57,19,200,true],
 ['CTVB/4-250',1390,.299,1.3,2690,58,35.5,120,true],
 ['CTVB/4-315',1410,.587,2.7,4340,62,35.5,120,true],
 ['CTVT/4-315',1400,.538,1.2,4320,62,36,120,true],
 ['CTVT/4-400',1430,1.139,2.3,6760,69,51,120,true],
 ['CTVT/4-450',1460,2.163,4.3,9050,71,null,120,true],
 ['CTVT/6-560',970,2.558,5.2,14410,68,139,120,true],
 ['CTVT/6-630',970,4.387,8.2,20560,71,197,120,true],
 ['CTVT/6-710',980,6.714,12.9,27280,75,247,120,true],
];
function harness(){
 const values={q:100,p:100,qmin:-1,qmax:1,pmin:-1,pmax:1};
 const document={readyState:'loading',documentElement:{lang:'tr'},addEventListener(){},querySelectorAll:()=>[],getElementById:id=>({value:values[id]||0})};
 const location={href:'https://select.vensis.com.tr/catalog.html'};
 const window={document,location,addEventListener(){}};
 const ctx=vm.createContext({window,document,location,Intl,URL,URLSearchParams,console,localStorage:{getItem:()=> 'tr'},setTimeout:()=>0,MutationObserver:class{observe(){}}});
 for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/catalog-feature-tags.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),ctx,{filename:f});
 return {window,values};
}
test('CTVB/CTVT technical values use the exact N rows, correct continuous limits and source units',()=>{
 const {window:w}=harness();
 for(const [name,speed,power,current,airflow,sound,weight,temp,fire] of rows){
  const m=w.VensisCatalog.getModel('SP|'+name);
  assert.equal(JSON.stringify([m.motor.speed,m.motor.power,m.motor.current,m.performance.maxAirflow,m.motor.sound,m.technical.weight]),JSON.stringify([speed,power,current,airflow,sound,weight]),name);
  assert.equal(m.technical.operatingTemperatureMaxC,temp);
  assert.equal(m.technical.operatingTemperatureMinC,null,'no invented ambient lower limit');
  assert.equal(m.technical.ipClass,'IP55');assert.equal(m.technical.insulationClass,'F');
  assert.equal(m.motor.frequency,'50 Hz');assert.equal(m.source.sourceModel,name+'N');
  assert.equal(m.source.sha256,m.dimensions.source.sha256);
  assert.equal(m.catalogOnly,false);
 }
 assert.equal(w.VensisCatalog.getModel('SP|CTVT/6-710').motor.voltage,'400-415 V');
});
test('F400 excludes the 180 model, includes verified 225N and never substitutes for continuous temperature',()=>{
 const {window:w}=harness();
 for(const [name,,,,,,,,fire] of rows){
  const m=w.VensisCatalog.getModel('SP|'+name);
  const tags=w.VensisCatalogFeatureTags(m,'tr');
  assert.equal(tags.includes('F400'),fire,name);
  assert.equal(m.technical.fireRating,fire?'F400 / 120 min':'');
  assert.equal(m.technical.smokeDurationMinutes,fire?120:0);
  assert.equal(m.technical.atex,null);
  assert.ok(m.technical.safetyWarning.length>0);
  assert.ok(m.technical.operatingTemperatureMaxC<400);
 }
});
test('all 40 original curves participate in selection and preserve their measured domains',()=>{
 const artifact=JSON.parse(read('assets/products/soler-palau/ctvb-ctvt-verified-curves.json'));
 assert.equal(artifact.extrapolation,false);assert.equal(artifact.summary.points,8000);
 const {window:w,values}=harness();w.VensisState.selectedSeries=new Set(['CTVB / CTVT']);
 const variants=w.VensisState.models.filter(m=>m.series==='CTVB / CTVT');assert.equal(variants.length,40);
 for(const m of variants){
  const points=w.VensisState.pointsFor(m);assert.equal(points.length,200);assert.ok(points[0][1]>0);
  const [p,q]=points[100];values.p=p;values.q=q;
  assert.ok(w.VensisSelection.select().results.some(r=>r.id===m.id),m.display);
  const source=artifact.models[m.model].curves.find(c=>c.control===m.control);
  assert.equal(JSON.stringify(points),JSON.stringify(source.sourcePoints));
  if(!['230V','50Hz'].includes(m.control)){assert.equal(m.kw,0);assert.equal(m.rpm,0);assert.equal(m.amps,0);}
 }
});
test('unresolved 450 weight stays absent in previews with both conflicting source values retained for review',()=>{
 const {window:w}=harness();const id='SP|CTVT/4-450',m=w.VensisCatalog.getModel(id);
 assert.equal(m.technical.weight,null);
 assert.equal(m.verification.unresolvedFields.weight.printedKg,310);
 assert.equal(m.verification.unresolvedFields.weight.alternativeManufacturerEditionKg,75);
 const html=w.VensisDirectPreview.html({mode:'catalog',product:w.VensisCatalog.product(id),model:m});
 assert.doesNotMatch(html,/<span>Ağırlık<\/span>/);
 assert.match(html,/doğrulama bekliyor/);
 assert.match(html,/F400/);
});
