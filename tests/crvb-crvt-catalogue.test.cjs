const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const expected=[
  ['CRVB/2-250N',2640,0.231,1,1320,58,11.5,70],
  ['CRVB/4-280N',1280,0.099,0.4,1350,48,17.5,70],
  ['CRVB/4-315N',1380,0.156,0.7,2050,53,27,70],
  ['CRVB/4-355N',1370,0.296,1.2,2960,57,29.5,70],
  ['CRVT/4-400N',1380,0.504,1.1,4540,58,28,70],
  ['CRVT/4-450N',1390,0.900,1.8,6080,63,38.5,70],
  ['CRVT/4-500N',1420,1.588,3.1,8530,68,54.5,70],
  ['CRVT/4-560N',1350,2.639,4.6,12710,71,70,60],
];
function harness(){
  const values={q:100,p:100,qmin:-1,qmax:1,pmin:-1,pmax:1};
  const document={readyState:'loading',documentElement:{lang:'tr'},addEventListener(){},querySelectorAll:()=>[],getElementById:id=>({value:values[id]||0})};
  const location={href:'https://select.vensis.com.tr/catalog.html'};
  const window={document,location,addEventListener(){}};
  const context=vm.createContext({window,document,console,Intl,URL,URLSearchParams,localStorage:{getItem:()=> 'tr'},location,setTimeout:()=>0,MutationObserver:class{observe(){}}});
  for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),context,{filename:f});
  return {window,values};
}
test('eight vertical-discharge CRVB/CRVT technical rows retain their units and source bases',()=>{
  const {window:w}=harness();
  for(const [name,rpm,power,current,airflow,sound,weight,maxC] of expected){
    const m=w.VensisCatalog.getModel('SP|'+name);
    assert.equal(m.motor.speed,rpm,name);
    assert.equal(m.motor.power,power,name);
    assert.equal(m.motor.current,current,name);
    assert.equal(m.performance.maxAirflow,airflow,name);
    assert.equal(m.motor.sound,sound,name);
    assert.equal(m.technical.weight,weight,name);
    assert.equal(m.technical.operatingTemperatureMinC,-40,name);
    assert.equal(m.technical.operatingTemperatureMaxC,maxC,name);
    assert.equal(m.technical.ipClass,'IP54');
    assert.equal(m.technical.insulationClass,'F');
    assert.equal(m.technical.powerBasis,'maximum-electrical-input-P1');
    assert.equal(m.technical.soundBasis,'outlet-sound-pressure-3m-operating-point-2');
    assert.equal(m.technical.fireRating,'');
    assert.equal(m.technical.atex,null);
    assert.equal(m.catalogOnly,false);
    assert.equal(m.source.sha256,m.dimensions.source.sha256,'curve and drawing use the same exact PDF');
    assert.match(m.description.general.join(' '),/P1/);
  }
  const three=w.VensisCatalog.getModel('SP|CRVT/4-450N');
  assert.equal(three.motor.frequency,'50 Hz');
  assert.equal(three.technical.current230A,3.1);
  assert.equal(three.technical.current400A,1.8);
  assert.equal(w.VensisVentilationDisplay.measurementNote(three.technical,'current'),'400 V');
});
test('all 32 original vector polylines preserve their measured domains and the real stall region',()=>{
  const artifact=JSON.parse(read('assets/products/soler-palau/crvb-crvt-verified-curves.json'));
  const {window:w}=harness();
  assert.equal(artifact.extrapolation,false);
  assert.equal(artifact.summary.points,6400);
  let count=0;
  for(const [name] of expected){
    const m=w.VensisCatalog.getModel('SP|'+name);
    const controls=name.startsWith('CRVB')?['100V','140V','180V','230V']:['25Hz','30Hz','40Hz','50Hz'];
    assert.equal(JSON.stringify(m.performance.controls),JSON.stringify(controls));
    assert.equal(m.performance.control,controls.at(-1));
    assert.equal(JSON.stringify(m.performance.sourcePoints),JSON.stringify(m.performance.curves.at(-1).sourcePoints));
    for(const c of m.performance.curves){
      count++;
      assert.equal(c.sourcePoints.length,200);
      assert.equal(c.interpolation,'linear');
      assert.equal(c.precomputed,true);
      assert.ok(c.sourcePoints[0][1]>0,'no invented zero-flow endpoint');
      assert.equal(c.sourcePoints.at(-1)[0],0);
      assert.equal(JSON.stringify(c),JSON.stringify(artifact.models[name].curves.find(a=>a.control===c.control)));
    }
  }
  assert.equal(count,32);
  const stall=w.VensisCatalog.getModel('SP|CRVT/4-560N').performance.curves.find(c=>c.control==='30Hz').sourcePoints;
  assert.ok(stall.some((p,i)=>i&&p[0]>stall[i-1][0]),'real stall-region rise must survive');
});
test('every model and control can be selected on its actual curve without fabricating reduced-speed motor data',()=>{
  const {window:w,values}=harness();
  w.VensisState.selectedSeries=new Set(['CRVB-N / CRVT-N']);
  const variants=w.VensisState.models.filter(m=>m.series==='CRVB-N / CRVT-N');
  assert.equal(variants.length,32);
  for(const model of variants){
    const points=w.VensisState.pointsFor(model),point=points[100];
    values.q=point[1]; values.p=point[0];
    const found=w.VensisSelection.select().results.find(r=>r.id===model.id);
    assert.ok(found,model.display);
    assert.ok(Math.abs(found.qq-point[1])<0.001,model.display);
    assert.ok(Math.abs(found.pp-point[0])<0.001,model.display);
    const full=['230V','50Hz'].includes(model.control);
    assert.equal(model.frequency,model.control.endsWith('Hz')?model.control.replace('Hz',' Hz'):'50 Hz');
    if(!full){assert.equal(model.rpm,0);assert.equal(model.amps,0);assert.equal(model.kw,0);assert.equal(model.spl,0);}
  }
});
test('catalogue previews explain power, sound and current while leaving unsupported fire and ATEX absent',()=>{
  const {window:w}=harness();
  for(const [name] of expected){
    const id='SP|'+name;
    const html=w.VensisDirectPreview.html({mode:'catalog',product:w.VensisCatalog.product(id),model:w.VensisCatalog.getModel(id)});
    assert.match(html,/P1 maks\./);
    assert.match(html,/Atış, 3 m/);
    assert.match(html,/-40/);
    assert.match(html,/IP54/);
    assert.doesNotMatch(html,/<span>Yangın Dayanımı<\/span>|<span>ATEX<\/span>|<span>Zamanlayıcı<\/span>/);
  }
});
