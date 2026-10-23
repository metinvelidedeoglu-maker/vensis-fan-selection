const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const document={readyState:'loading',documentElement:{lang:'en'},addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null};
const window={document,location:{href:'https://select.vensis.com.tr/catalog.html'},addEventListener(){}};
const context=vm.createContext({window,document,location:window.location,Intl,URL,URLSearchParams,console,localStorage:{getItem:()=> 'en'},setTimeout:()=>0,MutationObserver:class{observe(){}}});
for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/catalog-feature-tags.js','js/catalog-language-cleanup.js','js/core/utils.js','js/core/state.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),context,{filename:f});
const evidence=JSON.parse(read('assets/products/soler-palau/duct-catalogue-details.json'));
const model=name=>window.VensisCatalog.getModel('SP|'+name);

test('23 exact standard models use sourced motor IP, phase, weight and temperature, separate from their terminal boxes',()=>{
  assert.equal(evidence.models.length,23);assert.equal(Object.keys(evidence.sources).length,5);
  const weights={'CAB-125':16,'CAB-200':22,'CAB-250N':27,'CAB-315':33,'CAB-355':35,'CAB-400':35,
    'JETLINE-100':3,'JETLINE-125':3.4,'JETLINE-150':4.5,'JETLINE-160':4.5,'JETLINE-200':5.6,'JETLINE-250':6.5,'JETLINE-315':8.4,
    'SILENTUB-100':.5,'TDM-100':.4,'TDM-200':.6,'TDM-300':1.5,'TD-250/100':2,'TD-350/125':2,'TD-500/150':2.7,'TD-800/200':4.9,'TD-4000/355':19,'TD-6000/400':26};
  for(const [name,kg] of Object.entries(weights)){
    const m=model(name),t=m.technical;assert.equal(t.weight,kg,name);assert.equal(t.phase,'Single-phase');
    assert.equal(m.verification.ductCatalogue.sha256,evidence.sources[m.verification.ductCatalogue.source].sha256);
    if(name.startsWith('CAB')){
      assert.equal(t.ipClass,/355|400$/.test(name)?'IP55':'IP44');assert.equal(t.terminalBoxIpClass,'IP55');
      assert.deepEqual([t.operatingTemperatureMinC,t.operatingTemperatureMaxC],[-20,40]);
    }else if(name.startsWith('JETLINE')){
      assert.equal(t.ipClass,'IP44');assert.equal(t.terminalBoxIpClass,'IP65');assert.equal(m.motor.voltage,'220–240 V');
      assert.equal(m.motor.frequency,name==='JETLINE-315'?'50 Hz':'50/60 Hz');
      assert.deepEqual([t.operatingTemperatureMinC,t.operatingTemperatureMaxC],[-20,60]);
    }else if(name.startsWith('TDM')){
      assert.equal(t.ipClass,'IPX4');assert.equal(t.operatingTemperatureMinC,null);assert.equal(t.operatingTemperatureMaxC,40);
    }else if(name.startsWith('TD-')){
      const large=/4000|6000/.test(name);assert.equal(t.ipClass,large?'IP54':'IP44');assert.equal(t.insulationClass,large?'F':'B');
      assert.equal(t.electricalProtectionClass,large?'I':'II');assert.equal(m.motor.voltage,'230 V');
      assert.equal(t.operatingTemperatureMinC,large?-40:-20);assert.equal(t.operatingTemperatureMaxC,large||/250|350/.test(name)?40:60);
      assert.equal(m.motor.frequency,/250|350/.test(name)?'50 Hz':'50/60 Hz');
    }
  }
  assert.equal(model('SILENTUB-100').technical.operatingTemperatureMinC,0);
  assert.equal(model('SILENTUB-100').technical.operatingTemperatureMaxC,0);
  assert.equal(model('JETLINE-315').technical.weightSourceConflict.dimensionTableKg,8.9);
  for(const [name,flow] of [['CAB-125',240],['CAB-200',690],['CAB-250N',1230],['CAB-355',3150],['CAB-400',3400]])assert.equal(model(name).performance.maxAirflow,flow);
});

test('unknown current and SILENTUB temperature remain hidden in previews; model-specific features do not borrow Z, timer or TRIF variants',()=>{
  for(const row of evidence.models){
    const m=model(row.model),tags=Array.from(window.VensisCatalogFeatureTags(m,'en'));
    assert.ok(!tags.some(x=>/Timer|Sensor|ATEX|F300|F400/.test(x)),row.model);
    if(row.seriesId==='TDM')assert.ok(!tags.includes('Ball-Bearing Motor'),'Z bearings not assigned to generic TDM');
    if(row.seriesId==='TD-MIXVENT'){
      if(/250|350/.test(row.model))assert.ok(tags.includes('Two Speeds'));
      else if(/500\/150|800\/200/.test(row.model))assert.ok(tags.includes('Three Speeds'));
      else assert.ok(!tags.includes('Class II')&&!tags.includes('Three Speeds'));
    }
    for(const lang of ['tr','en']){
      const html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(m.id),model:m});
      assert.ok(html.includes(m.technical.ipClass));assert.ok(html.includes(evidence.series[row.seriesId].applications[lang][0]));
      assert.doesNotMatch(html,/<span>(?:Fire Rating|Yangın Dayanımı|Timer|Zamanlayıcı)<\/span>/);
      if(row.seriesId==='TDM'||row.seriesId==='SILENTUB'){
        assert.equal(m.motor.current,0);assert.doesNotMatch(html,/<span>(?:Current|Akım)<\/span>/);
      }
      if(row.seriesId==='SILENTUB')assert.doesNotMatch(html,/<span>(?:Operating Temperature|Çalışma Sıcaklığı)<\/span>/);
      if(row.model==='JETLINE-315')assert.ok(html.includes(lang==='tr'?'8,9':'8.9'),'visible source discrepancy');
    }
  }
});

test('acoustic labels distinguish radiated CAB/TD from JETLINE outlet and SILENTUB/TDM inlet',()=>{
  const note=name=>window.VensisVentilationDisplay.measurementNote(model(name).technical,'sound','en');
  assert.equal(note('CAB-125'),'Radiated, 2/3 Qmax');
  assert.equal(note('JETLINE-315'),'Outlet, 1.5 m');
  assert.equal(note('SILENTUB-100'),'Inlet, 1.5 m');
  assert.equal(note('TDM-300'),'Inlet, 1.5 m');
  assert.equal(note('TD-4000/355'),'Radiated, 3 m');
});

test('import is idempotent and preserves every curve, selection flow, drawing, price, existing override and unrelated model',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('duct',Path('scripts/import-sp-duct-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
d=json.loads(Path('data/ventilation-catalog.js').read_text().split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'));a=json.loads(Path(mod.EVIDENCE).read_text())
assert len(d['models'])==1022 and len(d['series'])==89
# Check the immutable historical hash before the separately audited curve repair.
prior=copy.deepcopy(d)
for c in reversed(json.loads(Path('assets/products/soler-palau/bath-verified-curves.json').read_text())['preservation']['modelChanges']):
 obj=next(m for m in prior['models'] if m['id']==c['id'])
 for k in c['path'][:-1]:obj=obj[k]
 assert obj.get(c['path'][-1])==c['value']
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
assert mod.digest(mod.protected_models(prior))==a['preservation']['protectedModelsSha256']
before=copy.deepcopy(d);assert mod.apply(a,d)==([],[]) and d==before
for c in reversed(a['preservation']['modelChanges']):
 obj=next(m for m in d['models'] if m['id']==c['id'])
 for k in c['path'][:-1]:obj=obj[k]
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
for c in reversed(a['preservation']['seriesChanges']):next(s for s in d['series'] if s['id']==c['id'])['description']=c['previous']
base=copy.deepcopy(d);mod.apply(a,d)
ids={r['id'] for r in a['models']}
for old,new in zip(base['models'],d['models']):
 if old['id'] not in ids:assert old==new
 else:
  assert old['performance']['operatingPoints']==new['performance']['operatingPoints']
  for key,value in old['verification'].items():assert new['verification'][key]==value
  for key,value in old['technical'].items():
   if value not in (None,'',0,False):assert new['technical'][key]==value
m=next(m for m in base['models'] if m['model']=='TDM-100');m['motor']['current']=.123;m['technical']['ipClass']='IP66';m['technical']['operatingTemperatureMinC']=-5;m['technical']['operatingTemperatureMaxC']=30
mod.apply(a,base);assert m['motor']['current']==.123 and m['technical']['ipClass']=='IP66';assert (m['technical']['operatingTemperatureMinC'],m['technical']['operatingTemperatureMaxC'])==(-5,30)
`],{cwd:root,encoding:'utf8'});
});
