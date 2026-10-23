const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const w={};vm.runInNewContext(read('data/ventilation-catalog.js'),{window:w});
vm.runInNewContext(read('js/catalog-feature-tags.js'),{window:w});
const data=JSON.parse(JSON.stringify(w.VensisVentilationData));
const audit=JSON.parse(read('assets/products/catalogue-content-details.json'));
const model=name=>data.models.find(m=>m.model===name);
const tags=name=>Array.from(w.VensisCatalogFeatureTags(model(name),'en'));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// The earlier copy-only audit keeps its original hashes. Reverse only the
// separately audited source completions before checking that historical snapshot.
function beforeLaterCompletions(){
  const result=JSON.parse(JSON.stringify(data));
  for(const file of ['duct-catalogue-details.json','design-catalogue-details.json','td-th-catalogue-details.json']){
   const later=JSON.parse(read('assets/products/soler-palau/'+file));
   for(const change of [...later.preservation.modelChanges].reverse()){
    let obj=result.models.find(m=>m.id===change.id);
    for(const key of change.path.slice(0,-1))obj=obj[key];
    const key=change.path.at(-1);
    assert.deepEqual(obj[key],change.value,change.id+' audited completion '+change.path.join('.'));
    if(change.previousPresent)obj[key]=change.previous;else delete obj[key];
   }
  }
  return result;
}

test('all twelve source PDFs use exact existing matches and preserve every numerical and safety field',()=>{
  assert.equal(Object.keys(audit.sources).length,12);
  assert.equal(Object.keys(audit.series).length,46);
  assert.equal(audit.models.length,685);
  assert.equal(new Set(audit.models.map(x=>x.id)).size,685);
  assert.equal(data.models.length,1022);assert.equal(data.series.length,89);
  const prior=beforeLaterCompletions();
  assert.equal(hash(prior.models.map(({features,description,verification,...v})=>v)),audit.preservation.protectedModelFieldsSha256);
  assert.equal(hash(data.series.map(({description,...v})=>v)),audit.preservation.protectedSeriesFieldsSha256);
  const ids=new Set(audit.models.map(x=>x.id));
  assert.equal(hash(prior.models.filter(x=>!ids.has(x.id))),audit.preservation.unmatchedModelsSha256);
  for(const row of audit.models){
    const m=data.models.find(x=>x.id===row.id);
    const prior=JSON.parse(read(row.eligibilityAudit)).models.find(x=>x.id===row.id);
    assert.equal(prior.seriesId,row.seriesId);assert.equal(m.seriesId,row.seriesId);
    assert.equal(m.verification.catalogueContent.sha256,audit.sources[row.source].sha256);
  }
});

test('optional sensors, reverse operation and speed counts remain specific to each product',()=>{
  for(const name of ['VORTICE 150/6 AR LL S','VORTICE 300/12 ARI LL S']){
    assert.ok(tags(name).includes('Automatic Shutter'));assert.ok(tags(name).includes('Reversible Airflow'));
    assert.ok(tags(name).includes('Long-Life Motor'));
    assert.ok(!tags(name).some(x=>/Timer|Sensor|ATEX|F300|F400/.test(x)));
  }
  assert.ok(tags('HV-150 AE').includes('Single Speed'));
  assert.ok(!tags('HV-150 AE').some(x=>/Two Speeds|Reversible|Natural/.test(x)));
  for(const name of ['HV-230 A','HV-300 A']){
    assert.ok(tags(name).includes('Two Speeds'));assert.ok(tags(name).includes('Reversible Airflow'));
    assert.ok(tags(name).includes('Natural Ventilation Mode'));
    assert.match(model(name).description.general.join(' '),/optional CR-300/);
  }
  assert.ok(tags('LINEO 100').includes('Two Speeds'));assert.ok(!tags('LINEO 100').includes('Three Speeds'));
  assert.ok(tags('LINEO 200').includes('Three Speeds'));assert.ok(!tags('LINEO 200').includes('Two Speeds'));
  assert.ok(tags('LINEO 100 QUIET').includes('Three Speeds'));assert.ok(!tags('LINEO 100 QUIET').includes('EC Motor'));
  assert.ok(tags('SLIMROOF 560 T ES').includes('Hinged Maintenance Access'));
  assert.ok(tags('SLIMROOF 630 T ES').includes('Hinged Maintenance Access'));
  assert.ok(!tags('SLIMROOF 500 T ES').includes('Hinged Maintenance Access'));
  assert.ok(!tags('AXR 35-2T-1').some(x=>/^F[34]00$/.test(x)));
  for(const m of data.models.filter(x=>x.seriesId==='CRK/ATEX'))assert.ok(!m.verification.catalogueContent);
});

test('reviewed series descriptions have exact Turkish copy without series-wide single-model defaults',()=>{
  const document={readyState:'loading',addEventListener(){}};
  const window={VensisVentilationData:data};
  vm.runInNewContext(read('js/catalog-language-cleanup.js'),{window,document,localStorage:{getItem:()=> 'tr'}});
  for(const row of Object.values(audit.series)){
    for(const [en,tr] of Object.entries(row.descriptionPatch?.translations||{}))assert.equal(window.VensisCatalogLanguage.productTextToTr(en),tr);
    if(row.description){
      for(const [key,values] of Object.entries(row.description.en)){
        for(let i=0;i<values.length;i++)assert.equal(window.VensisCatalogLanguage.productTextToTr(values[i]),row.description.tr[key][i]);
      }
    }
  }
  for(const sid of ['AXF','AXJ','BOX-AXF','TUNEL-AXF']){
    const text=data.series.find(s=>s.id===sid).description.general.join(' ');
    assert.match(text,/smoke-duty versions \(S2\) are offered for 200, 300 or 400/);
    assert.doesNotMatch(text,/fire conditions \(S2\) 200°C/);
  }
  for(const sid of ['LINEO','LINEO QUIET','CA MD EXTRA EU','HEATMASTER F400','SLIMROOF ES']){
    const text=JSON.stringify(data.series.find(s=>s.id===sid).description);
    assert.doesNotMatch(text,/Nominal duct connection: 100 mm|"400 V, 50 Hz\."|"230 V, 50\/60 Hz\."/);
  }
  for(const sid of ['HDB / HDT ATEX','HV-STYLVENT','HXBR / HXTR','ILT ATEX']){
    const desc=data.series.find(s=>s.id===sid).description;
    assert.ok(desc.general.length>=4);assert.ok(desc.motor.length>=1);
    assert.doesNotMatch(JSON.stringify(desc),/Bilgiler üreticinin|Catalogue vector controls|precomputed/);
  }
});
