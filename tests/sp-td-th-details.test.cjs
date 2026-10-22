const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const document={readyState:'loading',documentElement:{lang:'tr'},addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null};
const window={document,location:{href:'https://select.vensis.com.tr/catalog.html'},addEventListener(){}};
const context=vm.createContext({window,document,location:window.location,Intl,URL,URLSearchParams,console,localStorage:{getItem:()=> 'tr'},setTimeout:()=>0,MutationObserver:class{observe(){}}});
for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/catalog-feature-tags.js','js/catalog-language-cleanup.js','js/core/utils.js','js/core/state.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),context,{filename:f});
const byName=name=>window.VensisCatalog.getModel('SP|'+name);
const evidence=JSON.parse(read('assets/products/soler-palau/td-th-catalogue-details.json'));

test('ten exact TD/TH models use their own catalogue motor, temperature and acoustic data',()=>{
  const expected=[
    ['TD-800/200 EX',2450,.130,.54,43,5,-20,40],['TD-1100/250 EX',2630,.197,.81,46,20,-20,40],['TD-1200/315 EX',2600,.170,.71,44,25,-20,40],
    ['TH-800/200 EX',2450,.120,.50,58,8,-20,40],['TH-1100/250 EX',2630,.197,.85,55,22,-20,40],['TH-1200/315 EX',2600,.170,.74,52,28,-20,40],
    ['TH-500/150',2450,.050,.23,49.5,3.8,-20,60],['TH-800',2500,.120,.52,53,5.6,-20,60],['TH-1300',2400,.170,.83,59.5,11.2,-40,60],['TH-2000',2480,.255,1.27,67,17.2,-40,60]
  ];
  assert.equal(evidence.models.length,10);
  assert.equal(window.VensisCatalog.models.filter(m=>m.verification?.tdThCatalogue).length,10);
  for(const [name,...values] of expected){
    const m=byName(name),t=m.technical;
    assert.deepEqual([m.motor.speed,m.motor.power,m.motor.current,m.motor.sound,t.weight,t.operatingTemperatureMinC,t.operatingTemperatureMaxC],values,name);
    assert.equal(m.motor.voltage,'230 V');assert.equal(m.motor.frequency,'50 Hz');
    assert.equal(t.phase,'Single-phase');assert.equal(t.ipClass,'IP44');assert.equal(t.insulationClass,'B');
    assert.equal(t.powerBasis,'maximum-electrical-input-P1');assert.equal(t.currentReferenceVoltageV,230);
  }
  assert.equal(byName('TH-500/150').performance.maxAirflow,470);
  assert.equal(byName('TH-2000').performance.maxAirflow,1725);
});

test('TD radiated pressure at B, TH inlet pressure at A and motor IP44 are kept distinct',()=>{
  for(const name of Object.keys(evidence.sources))assert.match(evidence.sources[name].sha256,/^[0-9a-f]{64}$/);
  for(const name of ['TD-800/200 EX','TD-1100/250 EX','TD-1200/315 EX']){
    const t=byName(name).technical;assert.equal(t.externalTerminalBoxIpClass,'IP55');
    assert.equal(window.VensisVentilationDisplay.measurementNote(t,'sound','tr'),'Yayılan, 3 m, B');
    assert.equal(t.atex.gas_group,'IIB');assert.equal(t.atex.gas_marking,'II 2G Ex eb IIB T3 Gb');
  }
  for(const name of ['TH-800/200 EX','TH-1100/250 EX','TH-1200/315 EX']){
    const m=byName(name),t=m.technical;assert.equal(t.externalTerminalBoxIpClass,'IP55');
    assert.equal(window.VensisVentilationDisplay.measurementNote(t,'sound','en'),'Inlet, 3 m, A');
    assert.equal(t.atex.gas_group,'IIC');assert.equal(t.atex.gas_marking,'IIG Exe IIC T3 Gb');
    assert.notEqual(t.soundInletDbA3m,({ 'TH-800/200 EX':78,'TH-1100/250 EX':75,'TH-1200/315 EX':72 })[name],'LpA is not curve-page LwA');
    assert.match(t.safetyWarning,/ürün etiketi|Ürün etiketi/);
  }
  assert.match(byName('TD-800/200 EX').technical.atex.certificate,/LOM 08/);
  assert.match(byName('TD-1100/250 EX').technical.atex.certificate,/LOM 11/);
  for(const row of evidence.models){
    const m=byName(row.model),tags=Array.from(window.VensisCatalogFeatureTags(m,'en'));
    assert.equal(tags.includes('ATEX'),row.seriesId!=='TH-MIXVENT');
    assert.ok(!tags.some(t=>/F300|F400|Timer|Sensor/.test(t)));
    assert.equal(m.technical.fireRating,'');
  }
});

test('existing LS and HS selection variants retain distinct exhaust values and unknown low-speed sound',()=>{
  const expected=[['TH-500/150',1800,.045,.18],['TH-800',2100,.118,.50],['TH-1300',1800,.120,.52],['TH-2000',1750,.160,.79]];
  for(const [name,rpm,kw,amps] of expected){
    const variants=window.VensisState.models.filter(m=>m.productKey==='SP|'+name),ls=variants.find(m=>m.control==='LS'),hs=variants.find(m=>m.control==='HS');
    assert.equal(variants.length,2);assert.deepEqual([ls.rpm,ls.kw,ls.amps,ls.spl],[rpm,kw,amps,0],name+' low speed');
    const m=byName(name);assert.deepEqual([hs.rpm,hs.kw,hs.amps,hs.spl],[m.motor.speed,m.motor.power,m.motor.current,m.motor.sound],name+' high speed');
  }
  assert.equal(byName('TH-500/150').performance.nominalAirflow,500,'selection legacy airflow preserved');
  assert.equal(byName('TH-2000').performance.nominalAirflow,1720);
});

test('source completion is repeatable and preserves overrides, curve geometry, dimensions and unrelated products',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('tdth',Path('scripts/import-sp-td-th-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
d=json.loads(Path('data/ventilation-catalog.js').read_text().split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'))
a=json.loads(Path('assets/products/soler-palau/td-th-catalogue-details.json').read_text());again=copy.deepcopy(d)
assert mod.apply(a,d)==([],[]) and d==again
for c in reversed(a['preservation']['modelChanges']):
 obj=next(m for m in d['models'] if m['id']==c['id'])
 for k in c['path'][:-1]:obj=obj[k]
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
for c in reversed(a['preservation']['seriesChanges']):next(s for s in d['series'] if s['id']==c['id'])['description']=c['previous']
old=copy.deepcopy(d);m=next(m for m in d['models'] if m['model']=='TD-800/200 EX')
m['motor']['power']=9;m['technical']['ipClass']='IP66';m['technical']['operatingTemperatureMinC']=-5;m['technical']['operatingTemperatureMaxC']=30
mod.apply(a,d)
assert m['motor']['power']==9 and m['technical']['ipClass']=='IP66'
assert (m['technical']['operatingTemperatureMinC'],m['technical']['operatingTemperatureMaxC'])==(-5,30)
ids={r['id'] for r in a['models']}
for before,after in zip(old['models'],d['models']):
 if before['id'] not in ids:assert before==after
 else:
  for key in ['id','model','seriesId','catalogOnly','pricing','source','dimensions','media']:assert before[key]==after[key]
  for key in before['performance']:
   if key not in ['operatingPoints','maxAirflow']:assert before['performance'][key]==after['performance'][key]
  for x,y in zip(before['performance']['operatingPoints'],after['performance']['operatingPoints']):
   for key in x:
    if key not in ['power','speed','current','sound']:assert x[key]==y[key]
`],{cwd:root,encoding:'utf8'});
});

test('source explanations and measurement contexts reach the actual printable technical sheet',()=>{
  for(const name of ['TD-800/200 EX','TH-1200/315 EX','TH-500/150']){
    const m=byName(name),html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:'en',product:window.VensisCatalog.product(m.id),model:m});
    assert.match(html,/P1 max\./);assert.match(html,/IP44/);
    assert.doesNotMatch(html,/Bilgiler üreticinin|<span>Fire Rating<\/span>|<span>Timer<\/span>/);
    const expected=name.startsWith('TD-')?'Radiated, 3 m, B':name.endsWith('EX')?'Inlet, 3 m, A':'3 m, exhaust, high speed';
    assert.ok(html.includes(expected),name+' sound context');
    assert.ok(window.VensisCatalog.getSeries(m.seriesId).description.general.length>=4);
  }
  for(const [sid,desc] of Object.entries(evidence.series)){
    assert.equal(window.VensisCatalogLanguage.applicationSentenceToTr(desc.applications.en),desc.applications.tr.join(' '),sid+' reviewed Turkish application');
    const row=evidence.models.find(m=>m.seriesId===sid),m=byName(row.model);
    const html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:'tr',product:window.VensisCatalog.product(m.id),model:m});
    assert.ok(html.includes(desc.applications.tr[0]),sid+' complete Turkish preview copy');
    assert.ok(!html.includes(desc.applications.en[0]),sid+' no English application in TR');
  }
});
