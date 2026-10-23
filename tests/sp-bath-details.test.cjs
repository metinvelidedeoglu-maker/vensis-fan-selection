const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const document={readyState:'loading',documentElement:{lang:'en'},addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null};
const window={document,location:{href:'https://select.vensis.com.tr/catalog.html'},addEventListener(){}};
const context=vm.createContext({window,document,location:window.location,Intl,URL,URLSearchParams,console,localStorage:{getItem:()=> 'en'},setTimeout:()=>0,MutationObserver:class{observe(){}}});
for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/catalog-feature-tags.js','js/catalog-language-cleanup.js','js/core/utils.js','js/core/state.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),context,{filename:f});
const evidence=JSON.parse(read('assets/products/soler-palau/bath-catalogue-details.json'));
const model=name=>window.VensisCatalog.models.find(m=>m.model===name);
const tags=name=>Array.from(window.VensisCatalogFeatureTags(model(name),'en'));

test('14 standard 230 V bath fans use exact family weight, motor IP and maximum-only temperatures',()=>{
  assert.equal(evidence.models.length,14);assert.equal(Object.keys(evidence.sources).length,3);
  const expected=[['EDM-80 N',.4,'IP44',2350,80],['EDM-100',.48,'IP44',2450,95],['EDM-200',.9,'IP44',2500,180],
    ['DECOR-100',.44,'IPX4',2500,95],['DECOR-200',.8,'IPX4',2500,185],['DECOR-300',1.44,'IPX4',2200,280],
    ['SILENT-100 CZ',.57,'IP45',2400,95],['SILENT-100 CRZ',.57,'IP45',2400,95],['SILENT-100 CZ SILVER',.57,'IP45',2400,95],['SILENT-100 CRZ SILVER',.57,'IP45',2400,95],
    ['SILENT-200 CZ',.77,'IP45',2350,180],['SILENT-200 CRZ',.77,'IP45',2350,180],['SILENT-300 CZ',1.25,'IP45',2200,260],['SILENT-300 CRZ',1.25,'IP45',2200,260]];
  for(const [name,kg,ip,rpm,flow] of expected){
    const m=model(name),t=m.technical;
    assert.deepEqual([t.weight,t.ipClass,m.motor.speed,m.performance.maxAirflow],[kg,ip,rpm,flow],name);
    assert.equal(m.motor.voltage,'230 V');assert.equal(m.motor.frequency,'50 Hz');assert.equal(m.motor.current,0);
    assert.equal(t.phase,'Single-phase');assert.equal(t.insulationClass,'B');assert.equal(t.electricalProtectionClass,'II');
    assert.equal(t.operatingTemperatureMinC,null);assert.equal(t.operatingTemperatureMaxC,40);
    assert.equal(window.VensisVentilationDisplay.temperature(t),'≤ 40 °C');
    assert.equal(m.verification.bathCatalogue.sha256,evidence.sources[m.verification.bathCatalogue.source].sha256);
    if(m.seriesId==='DECOR')assert.equal(t.ipSourceConflict.narrative,'IP44');
  }
  assert.equal(model('SILENT-300 CZ').standard.speed,2200);assert.equal(model('SILENT-300 CRZ').standard.speed,2200);
  assert.equal(model('DECOR-300').performance.nominalAirflow,250,'selection nominal remains unchanged');
});

test('timer and silver labels follow the SILENT variant; unqualified EDM records do not acquire suffix options',()=>{
  for(const row of evidence.models){
    const m=model(row.model),labels=tags(row.model);
    assert.ok(labels.includes('Class II')&&labels.includes('Overload Protection'));
    assert.ok(!labels.some(x=>/ATEX|F300|F400|Humidity|Presence|Chrome/i.test(x)));
    if(m.seriesId==='SILENT'){
      assert.equal(labels.includes('Timer'),m.model.includes('CRZ'));
      assert.equal(labels.includes('Silver Front Cover'),m.model.includes('SILVER'));
      for(const label of ['Backdraught Shutter','Pilot Light','Vibration-Isolating Mounts','Ball-Bearing Motor'])assert.ok(labels.includes(label),row.model);
      assert.equal(m.catalogOnly,true);assert.equal(m.performance.curves.length,0,'no invented curve');
    }else{
      assert.ok(!labels.includes('Timer')&&!labels.includes('Ball-Bearing Motor'));
      if(m.seriesId==='DECOR')assert.ok(labels.includes('Backdraught Shutter')&&labels.includes('Neon Indicator'));
      else{
        assert.ok(!labels.includes('Backdraught Shutter'));
        assert.equal(labels.includes('Neon Indicator'),m.model==='EDM-200');
      }
    }
  }
  assert.ok(tags('EDM-80 N').includes('Exhaust Guide Vanes'));
  assert.equal(model('SILENT-100 CZ').motor.power,.008,'not ECOWATT or 12 V');
  assert.equal(model('SILENT-300 CZ').technical.weight,1.25,'not PLUS');
});

test('bilingual previews hide all missing currents and show IP conflicts and correct acoustic/power context',()=>{
  for(const row of evidence.models){
    const m=model(row.model),note=window.VensisVentilationDisplay.measurementNote(m.technical,'sound','en');
    assert.equal(note,m.seriesId==='SILENT'?'3 m':'1.5 m');
    for(const lang of ['tr','en']){
      const html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(m.id),model:m});
      assert.doesNotMatch(html,/<span>(?:Current|Akım|Fire Rating|Yangın Dayanımı|Timer|Zamanlayıcı)<\/span>/);
      assert.ok(html.includes('≤ 40 °C')&&html.includes(m.technical.ipClass));
      assert.ok(html.includes(evidence.series[row.seriesId].applications[lang][0].replace(/'/g,'&#039;')),row.model+' '+lang+' application');
      if(m.seriesId==='DECOR')assert.ok(html.includes('IPX4')&&html.includes('IP44'));
      else assert.ok(html.includes(lang==='tr'?'P1, serbest atış':'P1, free air'));
      if(['EDM-100','EDM-200'].includes(m.model)){
        assert.equal(m.technical.curveSourceReview.status,'requires-engineering-review');
        assert.ok(html.includes(lang==='tr'?'fan seçiminde kullanılmadan önce doğrulanmalıdır':'verify it before using the fan for selection'));
      }
    }
  }
});

test('source import is idempotent and preserves IDs, prices, drawings, geometry, eligibility and previous confirmations',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('bath',Path('scripts/import-sp-bath-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
d=json.loads(Path('data/ventilation-catalog.js').read_text().split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'));a=json.loads(Path(mod.EVIDENCE).read_text())
assert len(d['models'])==1022 and len(d['series'])==89
assert mod.digest(mod.protected_models(d))==a['preservation']['protectedModelsSha256']
before=copy.deepcopy(d);assert mod.apply(a,d)==([],[]) and d==before
for c in reversed(a['preservation']['modelChanges']):
 obj=next(m for m in d['models'] if m['id']==c['id'])
 for k in c['path'][:-1]:obj=obj[k]
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
for c in reversed(a['preservation']['seriesChanges']):next(s for s in d['series'] if s['id']==c['id'])['description']=c['previous']
base=copy.deepcopy(d);mod.apply(a,d);ids={r['id'] for r in a['models']}
for old,new in zip(base['models'],d['models']):
 if old['id'] not in ids:assert old==new
 else:
  assert old['performance']['operatingPoints']==new['performance']['operatingPoints']
  assert old['verification']['userConfirmedSupply']==new['verification']['userConfirmedSupply']
  if old['model'] not in ('SILENT-300 CZ','SILENT-300 CRZ'):assert old['motor']['speed']==new['motor']['speed']
  assert old['motor']['power']==new['motor']['power'] and old['motor']['sound']==new['motor']['sound']
m=next(m for m in base['models'] if m['model']=='EDM-100');m['motor']['current']=.321;m['technical']['ipClass']='IP66';m['technical']['operatingTemperatureMinC']=-5;m['technical']['operatingTemperatureMaxC']=30;m['features']={'en':['Verified custom override']}
mod.apply(a,base);assert m['motor']['current']==.321 and m['technical']['ipClass']=='IP66';assert (m['technical']['operatingTemperatureMinC'],m['technical']['operatingTemperatureMaxC'])==(-5,30);assert m['features']=={'en':['Verified custom override']}
`],{cwd:root,encoding:'utf8'});
});
