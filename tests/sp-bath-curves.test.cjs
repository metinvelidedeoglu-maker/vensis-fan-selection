const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const evidence=JSON.parse(read('assets/products/soler-palau/bath-verified-curves.json'));
function harness(){
 const inputs={q:0,p:0,qmin:0,qmax:0,pmin:0,pmax:0};
 const document={getElementById:id=>({value:String(inputs[id]??'')}),querySelectorAll:()=>[],addEventListener(){}};
 const window={document},context=vm.createContext({window,document,console});
 for(const file of ['data/ventilation-catalog.js','products/ventilation.js','js/core/utils.js','js/core/state.js','js/core/selection-engine.js'])vm.runInContext(read(file),context,{filename:file});
 return {window,inputs};
}

test('ten exact standard variants use five sourced 50 Hz curves; PLUS and other families stay excluded',()=>{
 const {window:w}=harness(),C=w.VensisCatalog,S=w.VensisState;
 assert.equal(C.models.length,1022);assert.equal(S.models.length,1305);assert.equal(evidence.models.length,10);
 assert.deepEqual(Object.keys(evidence.graphs),['EDM-100','EDM-200','SILENT-100','SILENT-200','SILENT-300']);
 assert.equal(evidence.models.filter(r=>r.family==='SILENT-100').length,4);
 assert.equal(evidence.models.filter(r=>r.family==='SILENT-200').length,2);
 assert.equal(evidence.models.filter(r=>r.family==='SILENT-300').length,2);
 for(const row of evidence.models){
  const m=C.getModel(row.id),g=evidence.graphs[row.family],curves=m.performance.curves;
  assert.equal(m.catalogOnly,false,row.model);assert.equal(curves.length,1);assert.equal(curves[0].control,'Nominal');
  assert.equal(curves[0].sourceFrequencyHz,50);assert.equal(curves[0].sourceSha256,evidence.sources[row.source]);
  assert.deepEqual(JSON.parse(JSON.stringify(curves[0].sourcePoints)),g.sourcePoints);
  const selection=S.models.filter(s=>s.productKey===m.id);assert.equal(selection.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(S.pointsFor(selection[0]))),g.sourcePoints,'no smoothing or rescaling');
  assert.equal(selection[0].amps,0,'unknown current stays unknown');assert.equal(selection[0].frequency,'50 Hz');
  assert.equal(m.verification.bathCurves.extrapolation,false);
 }
 assert.equal(evidence.graphs['SILENT-300'].drawing,174);assert.equal(evidence.graphs['SILENT-300'].excludedPlusDrawing,175);
 assert.ok(evidence.graphs['SILENT-300'].domain.flowMax<260,'not the 320 m³/h PLUS curve');
 assert.ok(evidence.graphs['EDM-200'].domain.flowMax<185,'old 221 m³/h scale rejected');
});

test('real selection engine finds all ten on-curve duties and refuses unplotted extensions',()=>{
 const {window:w,inputs}=harness(),S=w.VensisState;
 for(const row of evidence.models){
  const g=evidence.graphs[row.family],points=g.sourcePoints;
  const sample=points[Math.floor(points.length/2)];inputs.p=sample[0];inputs.q=sample[1];
  const match=w.VensisSelection.select().results.find(m=>m.productKey===row.id);
  assert.ok(match,row.model+' exact source duty');assert.ok(Math.abs(match.qq-inputs.q)<1e-5);assert.ok(Math.abs(match.pp-inputs.p)<1e-5);
  assert.equal(match.matchMode,'system-intersection');
  for(const [q,p] of [[g.domain.flowMax+10,1],[Math.max(g.domain.flowMin/2,1),g.domain.pressureMax+10]]){
   inputs.q=q;inputs.p=p;assert.ok(!w.VensisSelection.select().results.some(m=>m.productKey===row.id),row.model+' no extrapolation');
  }
 }
 for(const family of ['EDM-200','SILENT-100']){
  const g=evidence.graphs[family];assert.ok(g.domain.flowMin>20);
  inputs.q=g.domain.flowMin/2;inputs.p=g.domain.pressureMax;
  const ids=new Set(evidence.models.filter(r=>r.family===family).map(r=>r.id));
  assert.ok(!w.VensisSelection.select().results.some(m=>ids.has(m.productKey)),'clipped source top stays clipped');
 }
 assert.equal(S.models.filter(m=>m.catalogOnly===false&&S.pointsFor(m).length>0).length>970,true);
});

test('native paths reproduce every source point, and the reversible audit protects all other fields',()=>{
 execFileSync('python3',['-c',String.raw`
import copy,importlib.util,json,math,sys
from pathlib import Path
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('curves',Path('scripts/import-sp-bath-curves.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
a=json.loads(Path(mod.EVIDENCE).read_text());d=json.loads(Path('data/ventilation-catalog.js').read_text().split('window.VensisVentilationData=',1)[1].strip().removesuffix(';'))
assert a['sources']==mod.SOURCES
for family,g in a['graphs'].items():
 assert mod.convert(mod.flatten(g['nativeCommands']),g)==(g['sourcePoints'],g['zeroAxisTailClipped'])
 # Independent dense sampling of the original cubics, measured against the
 # reprojected imported polyline in PDF points. Axis inversion is independent
 # of the extraction code; precision includes four-decimal Q/P rounding.
 def inverse(value,ticks):
  ordered=sorted((v,x) for x,v in ticks)
  for (v0,x0),(v1,x1) in zip(ordered,ordered[1:]):
   if v0-1e-6<=value<=v1+1e-6:return x0+(value-v0)*(x1-x0)/(v1-v0)
  (v0,x0),(v1,x1)=ordered[:2] if value<ordered[0][0] else ordered[-2:]
  return x0+(value-v0)*(x1-x0)/(v1-v0)
 poly=[(inverse(q,g['flowTicks']),inverse(p,g['alignedPaTicks'])) for p,q in g['sourcePoints']]
 def segment_distance(p,a,b):
  dx,dy=b[0]-a[0],b[1]-a[1];den=dx*dx+dy*dy
  t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
  return math.dist(p,(a[0]+t*dx,a[1]+t*dy))
 for kind,*pts in g['nativeCommands']:
  for i in range(101 if kind=='c' else 2):
   t=i/100 if kind=='c' else i
   p=tuple(sum(((1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3)[j]*pts[j][k] for j in range(4)) for k in (0,1)) if kind=='c' else pts[i]
   if p[1]>g['baseline']:continue
   assert min(segment_distance(p,x,y) for x,y in zip(poly,poly[1:]))<.012,(family,p)
assert mod.digest(mod.protected(d))==a['preservation']['protectedDataSha256']
original=copy.deepcopy(d)
for c in reversed(a['preservation']['modelChanges']):
 obj=next(m for m in d['models'] if m['id']==c['id'])
 for key in c['path'][:-1]:obj=obj[key]
 assert obj.get(c['path'][-1])==c['value']
 if c['previousPresent']:obj[c['path'][-1]]=c['previous']
 else:del obj[c['path'][-1]]
prior=copy.deepcopy(d);again=copy.deepcopy(a);changes=mod.apply(again,d)
assert changes==a['preservation']['modelChanges'] and d==original
assert mod.apply(again,d)==[] and d==original
ids={r['id'] for r in a['models']}
for before,after in zip(prior['models'],d['models']):
 if before['id'] not in ids:assert before==after
 else:
  assert before['motor']==after['motor'] and before['pricing']==after['pricing']
  assert before['dimensions']==after['dimensions'] and before['media']==after['media']
  assert before['features']==after['features'] and before['verification']['userConfirmedSupply']==after['verification']['userConfirmedSupply']
  for key in ('nominalAirflow','maxAirflow'):assert before['performance'][key]==after['performance'][key]
`],{cwd:root,encoding:'utf8'});
});
