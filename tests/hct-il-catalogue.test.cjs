const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const hctRows=[
 ['HCTB/4-400-B',1290,.340,1.64,3700,59,16.5],
 ['HCTB/4-450-B',1290,.480,2.3,5600,62,23.5],
 ['HCTB/4-500-B',1290,.650,3,7100,69,25.4],
 ['HCTB/4-560-B',1200,.980,4.9,9820,73,40],
 ['HCTB/4-630-B',1290,1.7,7.6,13000,74,42.6],
 ['HCTT/4-710-B',1300,2.2,4,18400,82,60],
 ['HCTT/4-800-B',1400,3,7.3,23800,89,67],
 ['HCTT/4-900-B',1400,4,9.5,30000,92,77],
 ['HCTT/4-1000-B',1450,5.5,12,38500,93,123],
];
const ilRows=[
 ['ILB/4-200',1240,.240,1.15,1090,57,15,-40,70],
 ['ILB/4-225',1130,.520,2.45,1670,56,20,-40,70],
 ['ILB/4-250',1130,.950,4.4,2350,60,25,-40,70],
 ['ILB/6-285',825,.660,3.2,2650,55,32,-40,70],
 ['ILB/6-355',800,1.3,6.3,4070,60,60,-40,70],
 ['ILT/4-250',1170,.930,1.8,2650,62,25,-40,70],
 ['ILT/4-285',1070,1.260,2.4,3100,61,32,-40,70],
 ['ILT/4-315',1390,2.440,4.6,4160,68,42,-40,70],
 ['ILT/4-400',1350,6.350,9.3,7765,69,80,-20,60],
 ['ILT/6-355',875,1.380,3,4200,61,65,-40,70],
 ['ILT/6-400',950,3,6.4,7400,66,80,-20,60],
 ['ILT/6-450',900,5.350,10,10850,67,100,-20,40],
 ['ILT/8-400',700,1.340,3.7,5350,59,80,-20,70],
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
test('nine HCT B extraction rows use their own electrical data and inlet sound at 1.5m',()=>{
 const {window:w}=harness();
 for(const [name,speed,power,current,airflow,sound,weight] of hctRows){
  const m=w.VensisCatalog.getModel('SP|'+name),mono=name.startsWith('HCTB');
  assert.equal(JSON.stringify([m.motor.speed,m.motor.power,m.motor.current,m.performance.maxAirflow,m.motor.sound,m.technical.weight]),JSON.stringify([speed,power,current,airflow,sound,weight]),name);
  assert.equal(m.motor.voltage,mono?'230 V':'400 V');assert.equal(m.motor.frequency,'50 Hz');
  assert.equal(m.technical.currentReferenceVoltageV,mono?230:400);
  assert.equal(m.technical.soundInletDbA1_5m,sound);
  assert.match(m.description.general.join(' '),/aspirasyon/);
  assert.equal(m.source.sha256,m.dimensions.source.sha256);
 }
});
test('HCT large-motor IP55, -30/+40 limits and nominal power exceptions are not copied to smaller models',()=>{
 const {window:w}=harness();
 for(const [name] of hctRows){
  const m=w.VensisCatalog.getModel('SP|'+name),large=/-(800|900|1000)-/.test(name);
  assert.equal(m.technical.ipClass,large?'IP55':'IP65');
  assert.equal(m.technical.operatingTemperatureMinC,large?-30:-40);
  assert.equal(m.technical.operatingTemperatureMaxC,large?40:70);
  assert.equal(w.VensisVentilationDisplay.measurementNote(m.technical,'power'),large?'Nominal':'P1 maks.');
  assert.equal(m.performance.curves.length,1,'no unsourced transformer/star/inverter curves');
 }
 for(const name of ['HCTB/4-560-B','HCTB/4-630-B'])assert.match(w.VensisCatalog.getModel('SP|'+name).description.motor.join(' '),/kapsamı dışındadır/);
});
test('thirteen IL rows retain model-specific temperature/current/voltage and ducted 1m sound',()=>{
 const {window:w}=harness();
 for(const [name,speed,power,current,flow,sound,weight,low,high] of ilRows){
  const m=w.VensisCatalog.getModel('SP|'+name);
  assert.equal(JSON.stringify([m.motor.speed,m.motor.power,m.motor.current,m.performance.maxAirflow,m.motor.sound,m.technical.weight,m.technical.operatingTemperatureMinC,m.technical.operatingTemperatureMaxC]),JSON.stringify([speed,power,current,flow,sound,weight,low,high]),name);
  assert.equal(m.technical.ipClass,'IP55');assert.equal(m.technical.insulationClass,'F');
  assert.equal(w.VensisVentilationDisplay.measurementNote(m.technical,'sound'),'Kanallı, 1 m');
  assert.equal(m.motor.voltage,name.startsWith('ILB')?'230 V':name==='ILT/4-400'?'400 V':'230/400 V');
  assert.equal(m.source.sha256,m.dimensions.source.sha256);
 }
 assert.equal(w.VensisCatalog.getModel('SP|ILT/4-400').technical.current230A,null);
});
test('71 source curves are selectable as ordered polylines, including vertical and returning tails',()=>{
 const {window:w,values}=harness();w.VensisState.selectedSeries=new Set(['HCTB / HCTT','ILB / ILT']);
 const variants=w.VensisState.models.filter(m=>w.VensisState.selectedSeries.has(m.series));
 assert.equal(variants.length,71);
 const artifacts=['hctb-hctt','ilb-ilt'].map(n=>JSON.parse(read(`assets/products/soler-palau/${n}-verified-curves.json`)));
 for(const m of variants){
  const source=artifacts.find(a=>a.models[m.model]).models[m.model].curves.find(c=>c.control===m.control);
  const points=w.VensisState.pointsFor(m);assert.equal(points.length,m.series==='HCTB / HCTT'?201:200);
  assert.equal(JSON.stringify(points),JSON.stringify(source.sourcePoints));
  const [p,q]=points[100];values.p=p;values.q=q;
  assert.ok(w.VensisSelection.select().results.some(r=>r.id===m.id),m.display);
  assert.equal(m.frequency,'50 Hz');assert.equal(m.catalogOnly,false);
 }
 const tail=w.VensisState.models.find(m=>m.productKey==='SP|ILB/4-250'&&m.control==='140V');
 assert.ok(tail.points.some((p,i)=>i>0&&p[1]<tail.points[i-1][1]),'original return remains');
});
test('Pa calibration follows printed Pa labels and rejects the isolated 225 pressure-label typo',()=>{
 const a=JSON.parse(read('assets/products/soler-palau/ilb-ilt-verified-curves.json'));
 for(const m of Object.values(a.models)){
  const c=m.calibration;assert.match(c.pressureCalibration,/not mmWG conversion/);
  assert.ok(c.checkedPrintedPressureTicks.length>=5);
 }
 const rejected=a.models['ILB/4-225'].calibration.rejectedPrintedPressureTicks;
 assert.equal(rejected.length,1);assert.equal(rejected[0][1],150);
 assert.ok(a.models['ILB/4-250'].curves.at(-1).sourcePoints[0][0]>510);
 assert.ok(a.models['ILB/4-250'].curves.at(-1).sourcePoints[0][0]<525);
});
test('truncated ILT/4-400 domain is not extended to its tabulated maximum or to zero pressure',()=>{
 const {window:w,values}=harness();const id='SP|ILT/4-400',m=w.VensisCatalog.getModel(id);
 assert.equal(m.performance.maxAirflow,7765);
 assert.ok(m.performance.sourcePoints.at(-1)[0]>700);
 assert.ok(m.performance.sourcePoints.at(-1)[1]<7500);
 w.VensisState.selectedSeries=new Set(['ILB / ILT']);
 Object.assign(values,{p:50,q:7765,qmin:0,qmax:0,pmin:0,pmax:0});
 assert.ok(!w.VensisSelection.select().results.some(r=>r.productKey===id));
});
test('standard HCT/IL records have no ATEX or fire tags; insulation F is not fire resistance',()=>{
 const {window:w}=harness();
 for(const [name] of [...hctRows,...ilRows]){
  const m=w.VensisCatalog.getModel('SP|'+name);
  assert.equal(m.technical.atex,null);assert.equal(m.technical.fireRating,'');
  assert.deepEqual(Array.from(w.VensisCatalogFeatureTags(m,'tr')),[]);
  const html=w.VensisDirectPreview.html({mode:'catalog',product:w.VensisCatalog.product(m.id),model:m});
  assert.doesNotMatch(html,/<span>Yangın Dayanımı<\/span>/);
  assert.match(html,/1(?:,5)? m/);
 }
});
test('reduced-control motor data stay unknown instead of borrowing full-voltage power, rpm and current',()=>{
 const {window:w}=harness();
 const reduced=w.VensisState.models.filter(m=>m.series==='ILB / ILT'&&!['230V','400V'].includes(m.control));
 assert.equal(reduced.length,49);
 for(const m of reduced)for(const field of ['kw','rpm','amps','spl'])assert.equal(m[field],0,m.display+' '+field);
});
