const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const document={readyState:'loading',documentElement:{lang:'tr'},addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null};
const window={document,location:{href:'https://select.vensis.com.tr/catalog.html'},addEventListener(){}};
const context=vm.createContext({window,document,location:window.location,Intl,URL,URLSearchParams,console,localStorage:{getItem:()=> 'tr'},setTimeout:()=>0,MutationObserver:class{observe(){}}});
for(const f of ['data/ventilation-catalog.js','products/ventilation.js','js/catalog-feature-tags.js','js/catalog-language-cleanup.js','js/core/utils.js','js/core/state.js','js/ui/datasheet.js','js/ui/pdf-export.js'])vm.runInContext(read(f),context,{filename:f});
const evidence=JSON.parse(read('assets/products/soler-palau/design-catalogue-details.json'));
const byName=name=>window.VensisCatalog.getModel('SP|'+name);

test('six standard DESIGN records use their own electrical, acoustic, weight and upper-temperature values',()=>{
  const expected=[['DECOR-100 DESIGN',.0107,33,'IPX4',.55,80],['DECOR-200 DESIGN',.0197,39,'IPX4',.9,163],['DECOR-300 DESIGN',.023,40,'IPX4',1.6,230],['SILENT-100 DESIGN',.008,26.5,'IP45',.65,85],['SILENT-200 DESIGN',.016,35,'IP45',.88,175],['SILENT-300 DESIGN',.026,38,'IP45',1.5,250]];
  assert.equal(evidence.models.length,6);
  assert.equal(window.VensisCatalog.models.filter(m=>m.verification?.designCatalogue).length,6);
  for(const [name,power,sound,ip,weight,flow] of expected){
    const m=byName(name),t=m.technical;
    assert.deepEqual([m.motor.power,m.motor.sound,t.ipClass,t.weight,m.performance.maxAirflow],[power,sound,ip,weight,flow],name);
    assert.equal(m.motor.voltage,'230 V');assert.equal(m.motor.frequency,'50 Hz');
    assert.equal(m.motor.speed,0,'ECOWATT RPM must not leak into standard models');assert.equal(m.motor.current,0,'current is not calculated from watts/volts');
    assert.equal(t.operatingTemperatureMinC,null);assert.equal(t.operatingTemperatureMaxC,40);
    assert.equal(window.VensisVentilationDisplay.temperature(t),'≤ 40 °C');
    assert.equal(t.insulationClass,'B');assert.equal(t.electricalProtectionClass,'II');
    assert.equal(window.VensisVentilationDisplay.measurementNote(t,'sound','tr'),'3 m');
    assert.deepEqual([m.performance.operatingPoints[0].power,m.performance.operatingPoints[0].sound],[power,sound]);
  }
  assert.equal(window.VensisVentilationDisplay.measurementNote(byName('SILENT-100 DESIGN').technical,'power','tr'),'P1, serbest atış');
  assert.equal(byName('SILENT-300 DESIGN').technical.powerBasis,'maximum-electrical-input-P1');
});

test('optional sensors, timer, finish, PLUS and low-voltage kit data are not assigned to generic records',()=>{
  for(const row of evidence.models){
    const m=byName(row.model),t=m.technical,tags=Array.from(window.VensisCatalogFeatureTags(m,'en'));
    assert.equal(t.timerVariant,false);assert.equal(t.humiditySensor,false);assert.equal(t.atex,null);assert.equal(t.fireRating,'');
    assert.ok(!tags.some(x=>/Timer|Humidity|ATEX|F300|F400|EC Motor|Silver/.test(x)),row.model);
    assert.ok(tags.includes('Backdraught Shutter'));assert.ok(tags.includes('Overload Protection'));assert.ok(tags.includes('Class II'));
    if(row.seriesId==='SILENT DESIGN')assert.ok(tags.includes('Vibration-Isolating Mounts')&&tags.includes('Ball-Bearing Motor'));
    else {assert.ok(tags.includes('Neon Indicator'));assert.equal(t.ipSourceConflict.modelTable,'IPX4');assert.equal(t.ipSourceConflict.narrative,'IP44');}
  }
  assert.equal(byName('SILENT-100 DESIGN').motor.power,.008,'not 5 W ECOWATT or 12 W kit');
  assert.equal(byName('SILENT-300 DESIGN').technical.weight,1.5,'not 1.9 kg PLUS');
  assert.equal(evidence.sourceConflicts[0].used,'IPX4');
});

test('idempotent import preserves existing overrides, source geometry, prices, supply history and unrelated records',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('design',Path('scripts/import-sp-design-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
d=json.loads(Path('data/ventilation-catalog.js').read_text().split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'));a=json.loads(Path('assets/products/soler-palau/design-catalogue-details.json').read_text())
again=copy.deepcopy(d);assert mod.apply(a,d)==([],[]) and d==again
for c in reversed(a['preservation']['modelChanges']):
 obj=next(m for m in d['models'] if m['id']==c['id'])
 for k in c['path'][:-1]:obj=obj[k]
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
for c in reversed(a['preservation']['seriesChanges']):next(s for s in d['series'] if s['id']==c['id'])['description']=c['previous']
m=next(m for m in d['models'] if m['model']=='SILENT-100 DESIGN');m['motor']['power']=9;m['technical']['ipClass']='IP66';m['technical']['operatingTemperatureMinC']=-5;m['technical']['operatingTemperatureMaxC']=30
before=copy.deepcopy(d);mod.apply(a,d);assert m['motor']['power']==9 and m['technical']['ipClass']=='IP66';assert (m['technical']['operatingTemperatureMinC'],m['technical']['operatingTemperatureMaxC'])==(-5,30)
ids={r['id'] for r in a['models']}
for old,new in zip(before['models'],d['models']):
 if old['id'] not in ids:assert old==new
 else:
  for key in ['id','model','seriesId','catalogOnly','pricing','source','dimensions','media']:assert old[key]==new[key]
  assert old['verification']['userConfirmedSupply']==new['verification']['userConfirmedSupply']
  for key in old['performance']:
   if key!='operatingPoints':assert old['performance'][key]==new['performance'][key]
  for x,y in zip(old['performance']['operatingPoints'],new['performance']['operatingPoints']):
   for key in x:
    if key not in ['power','sound']:assert x[key]==y[key]
`],{cwd:root,encoding:'utf8'});
});

test('previews hide unverified speed/current, retain maximum-only temperature and translate full descriptions',()=>{
  for(const row of evidence.models){
    const m=byName(row.model);
    for(const lang of ['tr','en']){
      const html=window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(m.id),model:m});
      assert.doesNotMatch(html,/<span>(?:Speed|Devir|Current|Akım)<\/span>/,row.model+' unknown preview fields');
      assert.ok(html.includes('≤ 40 °C'));assert.ok(html.includes(m.technical.ipClass));assert.ok(html.includes('3 m'));
      assert.ok(html.includes(evidence.series[row.seriesId].applications[lang][0]));
      assert.doesNotMatch(html,/<span>(?:Fire Rating|Yangın Dayanımı|Timer|Zamanlayıcı)<\/span>/);
    }
  }
});
