const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/ventilation-catalog.js'),'utf8'),context);
const data=context.window.VensisVentilationData;
const series=new Map(data.series.map(s=>[s.id,s]));

test('Vitlo existing 2T/4T/2M/4M codes have consistent phase and pole metadata',()=>{
  const counts={'2T':0,'4T':0,'2M':0,'4M':0};
  let dual=0,unknown=0,phaseDerived=0,polesDerived=0;
  for(const m of data.models.filter(m=>series.get(m.seriesId).manufacturer==='Vitlo')){
    const hit=m.model.match(/(?:^|[\s-])([24](?:\/[24])?)([TM])(?=$|[\s-])/i);
    if(!hit){unknown++;assert.equal(m.technical.phase,'',m.id);continue;}
    const poles=hit[1],letter=hit[2].toUpperCase(),t=m.technical;
    assert.equal(t.phase.toLowerCase().replace(/[^a-z]/g,''),letter==='T'?'threephase':'singlephase',m.id);
    if(poles.includes('/')){dual++;assert.equal(t.poles,0,m.id+' must retain its dual-pole unknown scalar');}
    else{counts[poles+letter]++;assert.equal(t.poles,Number(poles),m.id);assert.equal(m.pole,Number(poles),m.id);}
    const derivation=m.verification.modelCodeDerivation;
    if(derivation){
      assert.equal(derivation.basis,'user-confirmed-model-code');
      assert.equal(derivation.token,poles+letter);
      phaseDerived+=derivation.fields.includes('phase');
      polesDerived+=derivation.fields.includes('poles');
    }
  }
  assert.deepEqual(counts,{'2T':192,'4T':419,'2M':16,'4M':17});
  assert.equal(dual,4);assert.equal(unknown,51);
  assert.equal(phaseDerived,589);assert.equal(polesDerived,579);
});

test('63-4T example preserves its 400 V, 1440 rpm, power and selection identity',()=>{
  const m=data.models.find(m=>m.id==='AXB|AXB 63-4T-1.5|14400|32');
  assert.ok(m);assert.equal(m.technical.phase,'Three-phase');assert.equal(m.technical.poles,4);
  assert.equal(m.motor.voltage,'400V');assert.equal(m.motor.speed,1440);assert.equal(m.motor.power,1.1);
  assert.equal(m.motor.frequency,'');assert.equal(m.technical.operatingTemperatureMaxC,0);
  assert.equal(m.dimensions.referenceModel,'63');assert.equal(m.pole,4);
  assert.equal(data.models.length,1022);
});

test('completion only fills missing Vitlo fields; it is idempotent and creates no variants',()=>{
  const result=execFileSync('python3',['-c',String.raw`
import copy, importlib.util, json, sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('vitlo_codes',Path('scripts/complete-vitlo-model-codes.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def row(name,brand='V',technical=None):
 return {'id':name,'model':name,'seriesId':brand,'pole':0,'motor':{'voltage':'','speed':0,'power':0},'technical':technical or {'phase':'','poles':0,'fireRating':'','atex':None},'verification':{'status':'needs_engineering_review','caution':'Keep source caution'},'performance':{'sourcePoints':[[0,120],[40,0]]}}
names=['AXB 63-4T-1.5','AXB 63-2t','AXB 63-4m','AXB 63-2M','AXJ 31-2/4T','AXB 63-14T','AXB 63-4TX','AXB 63-6T','AXB 63-4T-2M','CR 20EC']
d={'series':[{'id':'V','manufacturer':'Vitlo'},{'id':'S','manufacturer':'Soler & Palau'}],'models':[row(n) for n in names]+[row('Other 63-4T','S'),row('Known 63-4T',technical={'phase':'Manufacturer wording','poles':8})]}
original=copy.deepcopy(d);summary=module.complete(d)
assert len(d['models'])==len(original['models'])
for i,(before,after) in enumerate(zip(original['models'],d['models'])):
 if i<5:
  stripped=copy.deepcopy(after)
  stripped['technical']['phase']='';stripped['technical']['poles']=0
  del stripped['verification']['modelCodeDerivation']
  assert stripped==before,(before,after)
 else:assert before==after,(before,after)
assert [m['technical']['phase'] for m in d['models'][:5]]==['Three-phase','Three-phase','Single-phase','Single-phase','Three-phase']
assert [m['technical']['poles'] for m in d['models'][:5]]==[4,2,4,2,0]
again=copy.deepcopy(d);module.complete(d);assert d==again
print(json.dumps(summary))
`],{cwd:root,encoding:'utf8'});
  const summary=JSON.parse(result);
  assert.equal(summary.phase,5);assert.equal(summary.poles,4);assert.equal(summary.modelsUpdated,5);
});
