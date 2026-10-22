const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/ventilation-catalog.js'),'utf8'),context);
const data=context.window.VensisVentilationData;

test('133 confirmed bathroom, VARIO, HCM-N, LINEO and CA MD models have sourced single-phase metadata',()=>{
  const rows=data.models.filter(m=>m.verification?.userConfirmedSupply);
  assert.equal(rows.length,133);
  assert.equal(new Set(rows.map(m=>m.seriesId)).size,23);
  const counts={};
  for(const m of rows){
    const v=m.verification.userConfirmedSupply;
    assert.equal(m.technical.phase,'Single-phase',m.id);
    assert.equal(v.basis,'user-confirmed-series-supply');
    assert.equal(v.confirmedBy,'Metin');assert.equal(v.confirmedOn,'2026-10-22');
    assert.equal(v.seriesId,m.seriesId);
    assert.equal(v.fields.join(','),'phase');
    assert.equal(data.series.find(s=>s.id===m.seriesId).manufacturer,v.manufacturer);
    counts[v.manufacturer]=(counts[v.manufacturer]||0)+1;
  }
  assert.deepEqual(counts,{VORTICE:110,'Soler & Palau':23});
  for(const sid of ['HEATMASTER F400','SLIMROOF ES','E-ATEX','VORT QBK SAL-KC EVO','HCTB / HCTT','ILB / ILT','HXM','HXBR / HXTR']){
    assert.equal(rows.filter(m=>m.seriesId===sid).length,0,sid+' is outside the confirmation');
  }
  assert.ok(data.models.some(m=>m.seriesId==='HEATMASTER F400'&&m.technical.phase==='Three-phase'));
  assert.ok(data.models.some(m=>m.seriesId==='HCTB / HCTT'&&m.technical.phase==='Three-phase'));
  assert.equal(data.models.length,1022);
});

test('phase completion preserves overrides, timer meaning, manufacturer boundaries and other technical values',()=>{
  execFileSync('python3',['-c',String.raw`
import copy,importlib.util,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('phase',Path('scripts/complete-confirmed-single-phase.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def row(name,sid,phase=''):
 return {'id':name,'model':name,'seriesId':sid,'technical':{'phase':phase,'timerVariant':True,'ipClass':'IPX4','operatingTemperatureMaxC':40},'motor':{'voltage':'230 V','power':.01},'performance':{'sourcePoints':[[0,100],[50,0]]},'verification':{'status':'catalog-source'},'pricing':{'listPrice':100}}
d={'series':[{'id':'LINEO','manufacturer':'VORTICE'},{'id':'HCM-N','manufacturer':'Soler & Palau'},{'id':'HEATMASTER F400','manufacturer':'VORTICE'},{'id':'PUNTO','manufacturer':'Other manufacturer'}],
 'models':[row('LINEO 100 T','LINEO'),row('HCM-150 N','HCM-N'),row('Known override','LINEO','Three-phase'),row('Already known','LINEO','Single Phase'),row('HEATMASTER T4','HEATMASTER F400'),row('Other PUNTO','PUNTO')]}
before=copy.deepcopy(d);result=mod.complete(d)
assert result['modelsUpdated']==2
assert result['conflictsPreserved']==[{'id':'Known override','existingPhase':'Three-phase'}]
for index,(old,new) in enumerate(zip(before['models'],d['models'])):
 if index<2:
  assert new['technical']['phase']=='Single-phase'
  stripped=copy.deepcopy(new);stripped['technical']['phase']='';del stripped['verification']['userConfirmedSupply'];assert stripped==old
 else:assert new==old
again=copy.deepcopy(d);assert mod.complete(d)['modelsUpdated']==0;assert d==again
`],{cwd:root,encoding:'utf8'});
});
