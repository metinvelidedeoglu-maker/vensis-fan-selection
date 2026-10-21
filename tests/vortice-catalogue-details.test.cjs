const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const c={window:{}};
vm.runInNewContext(read('data/ventilation-catalog.js'),c);
const data=JSON.parse(JSON.stringify(c.window.VensisVentilationData));
const evidence=JSON.parse(read('assets/products/vortice/catalogue-details.json'));
const byId=new Map(data.models.map(m=>[m.id,m]));
const byCode=code=>data.models.find(m=>m.technical?.productCode===code);

test('seven supplied VORTICE catalogues match 46 exact models and verify existing IP values',()=>{
  assert.deepEqual(evidence.summary,{series:7,matchedModels:46,excludedModels:110});
  assert.equal(Object.keys(evidence.sources).length,7);
  assert.equal(evidence.models.length,46);
  assert.equal(new Set(evidence.models.map(r=>r.id)).size,46);
  const changed=new Set(),counts={};
  for(const r of evidence.models){
    const m=byId.get(r.id);
    assert.equal(m.seriesId,r.seriesId);
    assert.equal(m.technical.productCode,r.productCode);
    assert.ok(r.sourceRowExcerpt.includes(r.productCode));
    assert.match(evidence.sources[r.source].sha256,/^[a-f0-9]{64}$/);
    assert.equal(evidence.sources[r.source].editionYear,null);
    for(const [field,value] of Object.entries(r.technical))assert.deepEqual(m.technical[field],value,m.id+' '+field);
    const provenance=m.verification.catalogueDetails;
    if(!provenance)continue;
    changed.add(m.id);
    assert.equal(provenance.sourceSha256,evidence.sources[r.source].sha256);
    assert.equal(provenance.modelTablePage,r.modelTablePage);
    assert.equal(provenance.catalogueModel,r.catalogueModel);
    for(const f of provenance.fields)counts[f]=(counts[f]||0)+1;
  }
  assert.equal(changed.size,45);
  assert.deepEqual(counts,{weight:6,operatingTemperatureMinC:36,operatingTemperatureMaxC:36,operatingTemperatureByFrequencyC:2,phase:19});
  assert.equal(data.models.length,1022);
});

test('frequency limits and environmental temperatures do not become fire or optional-air ratings',()=>{
  for(const code of ['12415','12416']){
    const t=byCode(code).technical;
    assert.equal(t.operatingTemperatureMinC,null);
    assert.equal(t.operatingTemperatureMaxC,null);
    assert.deepEqual(t.operatingTemperatureByFrequencyC,{'50':{min:null,max:50},'60':{min:null,max:40}});
  }
  for(const r of evidence.models.filter(r=>r.seriesId==='HEATMASTER F400')){
    const t=byId.get(r.id).technical;
    assert.equal(t.operatingTemperatureMinC,-25);
    assert.equal(t.operatingTemperatureMaxC,60);
    assert.equal(t.continuousAirTemperatureC,80);
    assert.equal(t.smokeTemperatureC,400);
    assert.equal(t.smokeDurationMinutes,120);
    assert.match(t.fireRating,/^F400\b/);
  }
  assert.equal(byCode('15311').technical.phase,'','610/630 source typo is not silently repaired');
  assert.equal(byCode('15267').motor.voltage,'680 V','voltage conflict is retained for manufacturer review');
  assert.equal(evidence.existingValueConflicts.length,14);
});

test('unlisted ES/RF variants and optional sensors receive no copied catalogue fields',()=>{
  for(const r of evidence.excluded)assert.equal(byId.get(r.id).verification?.catalogueDetails,undefined,r.id);
  assert.equal(evidence.excluded.filter(r=>r.seriesId==='LINEO QUIET ES').length,6);
  assert.equal(evidence.excluded.filter(r=>r.seriesId==='CA MD E RF').length,6);
  for(const sid of ['VORTICE VARIO','VORTICE VARIO I','CA MD EXTRA EU']){
    for(const m of data.models.filter(m=>m.seriesId===sid)){
      assert.equal(m.technical.timerVariant,false,m.id+' optional timer');
      assert.equal(m.technical.humiditySensor,false,m.id+' optional sensor');
    }
  }
});

test('VORTICE importer fills only missing metadata and preserves overrides, safety and selection inputs',()=>{
  execFileSync('python3',['-c',String.raw`
import copy, importlib.util, sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('details',Path('scripts/import-vortice-catalogue-details.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def model(name,t):return {'id':name,'seriesId':'TEST','model':name,'technical':{'productCode':name,**t},'motor':{'power':1,'speed':1500,'current':2},'performance':{'sourcePoints':[[100,0],[0,200]]},'verification':{'status':'needs_engineering_review','caution':'retain'},'pricing':{'listPrice':123}}
unknown={'ipClass':'','weight':0,'phase':'','operatingTemperatureMinC':0,'operatingTemperatureMaxC':0,'continuousAirTemperatureC':80,'fireRating':'F400'}
override={**unknown,'ipClass':'IP66','weight':22,'phase':'Special','operatingTemperatureMinC':0,'operatingTemperatureMaxC':40}
d={'series':[{'id':'TEST','manufacturer':'VORTICE'}],'models':[model('empty',unknown),model('override',override),model('frequency',unknown),model('unlisted',unknown)]}
before=copy.deepcopy(d)
values={'ipClass':'IP55','weight':10,'phase':'Three-phase','operatingTemperatureMinC':-25,'operatingTemperatureMaxC':60}
rows=[{'id':m['id'],'seriesId':'TEST','productCode':m['id'],'source':'test.pdf','modelTablePage':3,'featurePage':2,'catalogueModel':m['model'],'technical':copy.deepcopy(values),'temperatureBasis':'environment'} for m in d['models'][:-1]]
rows[2]['technical'].update({'operatingTemperatureMinC':None,'operatingTemperatureMaxC':None,'operatingTemperatureByFrequencyC':{'50':{'min':None,'max':50},'60':{'min':None,'max':40}}})
a={'models':rows,'sources':{'test.pdf':{'sha256':'test-source'}}}
mod.apply(a,d)
assert d['models'][0]['technical']['operatingTemperatureMaxC']==60
assert d['models'][1]==before['models'][1]
assert d['models'][2]['technical']['operatingTemperatureMaxC'] is None
assert d['models'][3]==before['models'][3]
for old,new in zip(before['models'],d['models']):
 for k in ('motor','performance','pricing'):assert old[k]==new[k]
 for k in ('continuousAirTemperatureC','fireRating'):assert old['technical'][k]==new['technical'][k]
 assert old['verification']['status']==new['verification']['status']
 assert old['verification']['caution']==new['verification']['caution']
again=copy.deepcopy(d);mod.apply(a,d);assert d==again
`],{cwd:root,encoding:'utf8'});
});
