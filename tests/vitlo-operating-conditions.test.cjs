const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const context={window:{}};
vm.runInNewContext(read('data/ventilation-catalog.js'),context);
const data=context.window.VensisVentilationData;
const artifact=JSON.parse(read('assets/products/vitlo/catalogue-ip-temperature.json'));
const byId=new Map(data.models.map(m=>[m.id,m]));
const get=name=>data.models.find(m=>m.model===name);

test('623 exact catalogue matches carry motor IP and normal temperatures with field provenance',()=>{
  assert.equal(artifact.source.sha256,'4ab6811a59763ee92248210c307ab74c65143c061687a59adfde9a55a9241b9f');
  assert.equal(artifact.source.pages,60);
  assert.deepEqual(artifact.summary,{series:35,matchedModels:623,excludedModels:76});
  assert.equal(artifact.models.length,623);
  const counts={};
  for(const match of artifact.models){
    const m=byId.get(match.id),s=artifact.series[match.seriesId],t=m.technical;
    assert.equal(m.seriesId,match.seriesId);
    for(const field of ['ipClass','operatingTemperatureMinC','operatingTemperatureMaxC','continuousAirTemperatureC'])assert.equal(t[field],s[field],m.id+' '+field);
    const provenance=m.verification.catalogueOperatingConditions;
    assert.equal(provenance.featurePage,s.featurePage,m.id);
    assert.equal(provenance.modelTablePage,s.modelTablePage,m.id);
    assert.equal(provenance.sourceSha256,artifact.source.sha256,m.id);
    assert.equal(provenance.catalogueModel,match.catalogueModel,m.id);
    assert.equal(provenance.fields.length,4);
    counts[t.ipClass]=(counts[t.ipClass]||0)+1;
  }
  assert.deepEqual(counts,{IP55:422,IP65:123,IP44:6,IP54:72});
  assert.equal(data.models.length,1022);
});

test('motor IP excludes the junction box and normal temperature excludes fire S2',()=>{
  const axf=get('AXF 35-2T-1'),axb=get('AXB 63-4T-1.5'),atex=get('AXW/ATEX 35-4T-0.18');
  assert.equal(axf.technical.ipClass,'IP55');assert.equal(axf.technical.operatingTemperatureMinC,-20);
  assert.equal(axf.technical.operatingTemperatureMaxC,55);assert.equal(axf.technical.continuousAirTemperatureC,55);
  assert.equal(axb.technical.ipClass,'IP55');assert.equal(axb.technical.operatingTemperatureMaxC,120);
  assert.equal(atex.technical.ipClass,'IP65');assert.equal(atex.technical.operatingTemperatureMaxC,55);
  assert.notEqual(axf.technical.ipClass,'IP67');assert.notEqual(atex.technical.ipClass,'IP67');
  assert.match(artifact.series.AXF.sourceExcerpts.tr.normalTemperature,/S1/);
  assert.doesNotMatch(artifact.series.AXF.sourceExcerpts.tr.normalTemperature,/S2/);
});

test('+50-only ratings leave the lower limit unspecified across all eleven applicable series',()=>{
  let count=0;const series=new Set();
  for(const match of artifact.models){
    const m=byId.get(match.id);if(artifact.series[m.seriesId].operatingTemperatureMinC!==null)continue;
    assert.equal(m.technical.operatingTemperatureMinC,null,m.id);
    assert.equal(m.technical.operatingTemperatureMaxC,50,m.id);
    assert.equal(m.technical.continuousAirTemperatureC,50,m.id);
    count++;series.add(m.seriesId);
  }
  assert.equal(count,78);assert.equal(series.size,11);
});

test('76 unlisted variants keep their original overrides and 0/0 unknown temperature',()=>{
  let knownIP=0,missingIP=0;
  for(const row of artifact.excluded){
    const m=byId.get(row.id);
    assert.equal(m.technical.operatingTemperatureMinC,0,m.id);
    assert.equal(m.technical.operatingTemperatureMaxC,0,m.id);
    assert.equal(m.technical.continuousAirTemperatureC,0,m.id);
    assert.equal(m.verification.catalogueOperatingConditions,undefined,m.id);
    if(m.technical.ipClass)knownIP++;else missingIP++;
  }
  assert.equal(knownIP,57);assert.equal(missingIP,19);
  assert.equal(artifact.excluded.filter(m=>m.seriesId==='CRK/ATEX').length,15);
  assert.equal(get('CRS/ATEX 40-2T-5.5').technical.ipClass,'IP66');
  assert.equal(get('AXW/ATEX 50-4M-0.75').technical.ipClass,'');
});

test('import only fills missing matched fields, preserves specific limits and is idempotent',()=>{
  execFileSync('python3',['-c',String.raw`
import copy, importlib.util, sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('conditions',Path('scripts/import-vitlo-operating-conditions.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def row(name,t):return {'id':name,'seriesId':'AXB','model':name,'motor':{'voltage':'400 V'},'technical':t,'verification':{'status':'needs_engineering_review','caution':'keep'},'performance':{'sourcePoints':[[0,100],[50,0]]}}
base={'ipClass':'','operatingTemperatureMinC':0,'operatingTemperatureMaxC':0,'continuousAirTemperatureC':0}
known={'ipClass':'IP66','operatingTemperatureMinC':0,'operatingTemperatureMaxC':40,'continuousAirTemperatureC':35}
d={'series':[{'id':'AXB','manufacturer':'Vitlo'}],'models':[row('match',base.copy()),row('specific',known.copy()),row('known-range',{**base,'operatingTemperatureMinC':-10,'operatingTemperatureMaxC':40}),row('known-continuous',{**base,'continuousAirTemperatureC':40}),row('unlisted',base.copy())]}
original=copy.deepcopy(d)
a={'series':{'AXB':{'ipClass':'IP55','operatingTemperatureMinC':-20,'operatingTemperatureMaxC':120,'continuousAirTemperatureC':120,'featurePage':34,'modelTablePage':35}},'models':[{'id':m['id'],'seriesId':'AXB','catalogueModel':m['model']} for m in d['models'][:-1]]}
module.apply(a,d)
assert d['models'][0]['technical']=={'ipClass':'IP55','operatingTemperatureMinC':-20,'operatingTemperatureMaxC':120,'continuousAirTemperatureC':120}
assert d['models'][1]==original['models'][1]
assert d['models'][2]['technical']['operatingTemperatureMaxC']==40
assert d['models'][2]['technical']['continuousAirTemperatureC']==0
assert d['models'][3]['technical']['operatingTemperatureMaxC']==0
assert d['models'][3]['technical']['continuousAirTemperatureC']==40
assert d['models'][4]==original['models'][4]
again=copy.deepcopy(d);module.apply(a,d);assert d==again
for before,after in zip(original['models'],d['models']):
 assert before['motor']==after['motor'] and before['performance']==after['performance']
 assert before['verification']['status']==after['verification']['status']
 assert before['verification']['caution']==after['verification']['caution']
assert module.catalogue_model({'seriesId':'AXR/ATEX','model':'AXR/ATEX AXR/ATEX63-4T-1'})=='AXR/ATEX63-4T-1'
assert module.catalogue_model({'seriesId':'CR-EC','model':'CR-EC CR 20EC'})=='CR 20EC'
`],{cwd:root,encoding:'utf8'});
});
