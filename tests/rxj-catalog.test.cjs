const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const extension='data/ventilation-rxj-addition.js';
function load(){
  const document={readyState:'loading',documentElement:{lang:'tr'},getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){}};
  const window={document,location:{href:'https://select.vensis.com.tr/catalog.html'},addEventListener(){}};
  const context=vm.createContext({window,document,console,Intl,URL,URLSearchParams,localStorage:{getItem:()=>null},setTimeout:()=>0,MutationObserver:class{observe(){}}});
  const run=file=>vm.runInContext(read(file),context,{filename:file});
  run('data/ventilation-catalog.js');
  return {window,run};
}
test('RXJ adds exactly two distinct products and preserves every existing record',()=>{
  const {window:w,run}=load(),data=w.VensisVentilationData;
  const before=plain(data);
  run(extension);
  assert.equal(data.models.length,before.models.length+2);
  assert.equal(data.series.length,before.series.length+1);
  assert.deepEqual(plain(data.models.filter(m=>m.seriesId!=='RXJ')),before.models);
  assert.deepEqual(plain(data.series.filter(s=>s.id!=='RXJ')),before.series);
  const once=plain(data);run(extension);assert.deepEqual(plain(data),once);
  assert.equal(new Set(data.models.map(m=>m.id)).size,data.models.length);
});
test('semantic duplicate guard recognises a previously stored RXJ variant with another key',()=>{
  const {window:w,run}=load();run(extension);
  const low=w.VensisVentilationData.models.find(m=>m.seriesId==='RXJ');
  low.id='previously-stored-rxj';
  const count=w.VensisVentilationData.models.length;run(extension);
  assert.equal(w.VensisVentilationData.models.length,count);
});
test('both PDF rows retain high/low speed ratings, dimensions and the approved EUR prices',()=>{
  const {window:w,run}=load();run(extension);
  const rows=w.VensisVentilationData.models.filter(m=>m.seriesId==='RXJ');
  const expected=[
    {price:1750,ratings:[[1440,7200,1.3,3.23,64,78],[720,3600,0.3,1.43,16,63]],dims:{A:290,B:1200,C:840,D:920}},
    {price:2500,ratings:[[1440,10000,2.8,6.44,100,85],[720,5000,0.7,2.63,25,70]],dims:{A:330,B:1780,C:1000,D:1080}}
  ];
  rows.forEach((m,index)=>{
    const e=expected[index];
    assert.equal(m.catalogueModel,'RXJ 50/100');
    assert.equal(m.pricing.listPrice,e.price);assert.equal(m.pricing.currency,'EUR');
    assert.deepEqual(plain(m.performance.speedRatings.map(r=>[r.speedRpm,r.airflowM3h,r.powerKw,r.currentA,r.thrustN,r.soundPressureDbA])),e.ratings);
    assert.deepEqual(plain(m.dimensions.values),e.dims);
    assert.deepEqual(plain(m.technical.dimensions),e.dims);
    assert.equal(m.motor.voltage,'400V');assert.equal(m.motor.frequency,'50 Hz');
    assert.equal(m.technical.ipClass,'IP55');assert.equal(m.technical.junctionBoxIpClass,'IP67');
    assert.equal(m.technical.insulationClass,'H');assert.equal(m.technical.efficiencyClass,'IE2/3');
    assert.equal(m.technical.operatingTemperatureMinC,-20);assert.equal(m.technical.operatingTemperatureMaxC,55);
    assert.equal(m.technical.fireRating,'');assert.equal(m.catalogOnly,true);
    assert.deepEqual(plain(m.performance.sourcePoints),[]);assert.deepEqual(plain(m.performance.curves),[]);
    assert.equal(m.source.page,7);assert.equal(m.verification.tableRow,index+1);
    assert.match(m.verification.sourceSha256,/^[a-f0-9]{64}$/);
    assert.ok(fs.existsSync(path.join(root,m.media.dimensionImage)));
  });
});
test('common product API, translated datasheets and agent snapshot keep the variants separate',()=>{
  const {window:w,run}=load();run(extension);
  for(const f of ['products/ventilation-language.js','products/ventilation.js','js/core/utils.js','js/core/state.js','js/ui/datasheet.js','js/ui/pdf-export.js'])run(f);
  const rows=w.VensisCatalog.modelsForSeries('RXJ');
  assert.equal(rows.length,2);assert.notEqual(w.VensisCatalog.modelSlug(rows[0]),w.VensisCatalog.modelSlug(rows[1]));
  const agent=JSON.parse(read('api/agent/catalog-v1.json')).models.filter(m=>m.series==='RXJ');
  assert.equal(agent.length,2);
  rows.forEach(m=>{
    const product=w.VensisCatalog.product(m.id);
    const html=w.VensisDirectPreview.html({product,model:m,outputLanguage:'tr'});
    for(const v of Object.values(m.dimensions.values))assert.ok(html.includes(String(v))||html.includes(new Intl.NumberFormat('tr-TR').format(v)),String(v));
    assert.ok(html.includes(m.model));
    assert.ok(html.includes(m.description.motor[0])||html.includes(w.VensisProductLanguage.text(m.description.motor[0],'tr')));
    assert.equal(w.VensisState.pointsFor(w.VensisState.models.find(r=>r.productKey===m.id)).length,0);
    const a=agent.find(a=>a.productKey===m.id);assert.ok(a);assert.equal(a.pricing.listPrice,m.pricing.listPrice);
    assert.equal(a.catalogOnly,true);assert.equal(a.quoteEligible,false);assert.deepEqual(a.selectionPoints,[]);
  });
  assert.ok(read('products/ventilation-loader.js').includes(extension));
});
test('PHP sitemap publishes both unique variants in Turkish and English',()=>{
  const {window:w,run}=load();run(extension);run('products/ventilation.js');
  const xml=execFileSync('php',['sitemap-fans.php'],{cwd:root,encoding:'utf8'});
  for(const m of w.VensisCatalog.modelsForSeries('RXJ'))for(const lang of ['tr','en']){
    const url=`https://select.vensis.com.tr/${lang}/fan/vitlo/rxj/${w.VensisCatalog.modelSlug(m)}/`;
    assert.equal(xml.split('<loc>'+url+'</loc>').length-1,1,url);
  }
});
