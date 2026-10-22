const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),w={};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/ventilation-catalog.js'),'utf8'),{window:w});
const d=JSON.parse(JSON.stringify(w.VensisVentilationData));
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/four-catalogue-details.json'),'utf8'));
const byName=name=>d.models.find(m=>m.model===name);

test('four supplied PDF tables complete exactly 16 existing models with correct measurement bases',()=>{
  assert.equal(evidence.models.length,16);assert.equal(Object.keys(evidence.sources).length,4);
  assert.equal(d.models.filter(m=>m.verification?.fourCatalogueDetails).length,16);
  for(const row of evidence.models){
    const m=byName(row.model);
    assert.equal(m.id,row.id);assert.equal(m.seriesId,row.seriesId);
    assert.deepEqual(m.motor,row.motor,m.model);
    assert.equal(m.performance.maxAirflow,row.sourceMaxAirflow,m.model+' tabulated maximum');
    for(const [field,value] of Object.entries(row.technical))assert.deepEqual(m.technical[field],value,m.model+' '+field);
    assert.equal(m.verification.fourCatalogueDetails.sourceSha256,evidence.sources[row.source].sha256);
    assert.equal(m.motor.frequency,'50 Hz');
    for(const p of m.performance.operatingPoints||[])for(const f of ['power','speed','current','sound'])assert.equal(p[f],m.motor[f],m.model+' '+f);
  }
  assert.equal(byName('HV-150 AE').technical.reversible,false);
  assert.equal(byName('HV-230 A').technical.reversible,true);
  assert.equal(byName('HV-300 A').technical.reversible,true);
  assert.equal(byName('HV-150 AE').technical.operatingTemperatureMinC,null);
  assert.equal(byName('HV-300 A').technical.operatingTemperatureMaxC,45);
  for(const name of ['HV-150 AE','HV-230 A','HV-300 A'])assert.equal(byName(name).catalogOnly,true);
  assert.deepEqual(evidence.correctedExistingValues.map(r=>[r.id,r.previous,r.sourceValue]),[
    ['SP|HXTR/4-500',9550,9490],['SP|HXTR/4-560',12040,11990],['SP|HXTR/4-630',13720,13540],['SP|HXTR/6-710',16110,15710]
  ]);
  assert.equal(byName('HDT/4-315').technical.powerBasis,'nominal-motor-power');
  assert.equal(byName('HXTR/4-500').motor.power,.943);
  assert.equal(byName('HXTR/4-560').technical.soundMeasurementDistanceM,1.68);
  assert.equal(byName('HXTR/4-630').technical.soundMeasurementDistanceM,1.89);
  assert.equal(byName('HXTR/6-710').technical.soundMeasurementDistanceM,2.13);
  assert.equal(byName('ILT/4-225 EX').motor.current,1);
  assert.equal(byName('ILT/4-225 EX').technical.current230A,1.7);
  assert.equal(byName('ILT/4-225 EX').motor.sound,62);
  assert.equal(byName('ILT/4-225 EX').technical.soundOutletDbA1_5m,66);
  assert.equal(byName('ILT/4-225 EX').technical.soundOperatingPoint,'A');
  for(const row of evidence.models){
    const m=byName(row.model),atex=m.technical.atex;
    if(row.seriesId==='HDB / HDT ATEX')assert.equal(atex.gas_marking,'II 2G EExd IIB T5');
    else if(row.seriesId==='ILT ATEX')assert.equal(atex.gas_marking,'II 2G Ex eb IIB T3 Gb');
    else assert.equal(atex,null,m.model+' is not ATEX');
    assert.equal(m.technical.fireRating,'');assert.equal(m.technical.timerVariant,false);
  }
});

test('completion preserves existing overrides, reduced controls, curves, price, safety history and other records',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('details',Path('scripts/import-sp-four-catalogue-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
raw=Path('data/ventilation-catalog.js').read_text();d=json.loads(raw.split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'))
a=json.loads(Path('assets/products/soler-palau/four-catalogue-details.json').read_text());row=a['models'][0];m=next(m for m in d['models'] if m['id']==row['id'])
del m['verification']['fourCatalogueDetails'];m['motor']['power']=9;m['motor']['speed']=0;m['technical']['ipClass']='IP66';m['technical']['operatingTemperatureMinC']=None;m['technical']['operatingTemperatureMaxC']=None
m['performance']['operatingPoints'].append({'control':'140V','power':0,'speed':0,'current':0,'sound':0})
m['verification']['caution']='Preserve original review';before=copy.deepcopy(d)
assert mod.apply(a,d)==1
assert m['motor']['power']==9 and m['motor']['speed']==row['motor']['speed'] and m['technical']['ipClass']=='IP66'
assert m['technical']['operatingTemperatureMinC']==-20 and m['technical']['operatingTemperatureMaxC']==40
assert m['performance']['operatingPoints'][-1]==before['models'][next(i for i,v in enumerate(before['models']) if v['id']==m['id'])]['performance']['operatingPoints'][-1]
for old,new in zip(before['models'],d['models']):
 if old['id']!=m['id']:assert old==new
 else:
  assert old['pricing']==new['pricing'];assert old['catalogOnly']==new['catalogOnly'];assert old['performance']==new['performance'];assert old['verification']['caution']==new['verification']['caution']
again=copy.deepcopy(d);assert mod.apply(a,d)==0;assert d==again
`],{cwd:root,encoding:'utf8'});
});
