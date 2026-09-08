const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function policyContext(){
  const context={window:{},console};
  vm.createContext(context);
  vm.runInContext(read('data/sp-silent-workbook-policy.js'),context,{filename:'data/sp-silent-workbook-policy.js'});
  return context;
}

const expected=[
  ['SILENT-100 CZ',95,67,false,'Pilot lamba, geri tepme ventili'],
  ['SILENT-100 CRZ',95,98,true,'Pilot lamba, geri tepme ventili, timer'],
  ['SILENT-100 CZ SILVER',95,83,false,'Krom renk, geri tepme ventili'],
  ['SILENT-100 CRZ SILVER',95,102,true,'Krom renk, geri tepme ventili, timer'],
  ['SILENT-200 CZ',180,98,false,'Pilot lamba, geri tepme ventili'],
  ['SILENT-200 CRZ',180,129,true,'Pilot lamba, geri tepme ventili, timer'],
  ['SILENT-300 CZ',260,127,false,'Pilot lamba, geri tepme ventili'],
  ['SILENT-300 CRZ',260,158,true,'Pilot lamba, geri tepme ventili, timer']
];

test('SILENT workbook policy replaces the three generic rows with the confirmed eight variants',()=>{
  const context=policyContext();
  context.window.VensisSPWorkbookRows=[
    {series:'JETLINE',altModel:'JETLINE-100'},
    {series:'SILENT',altModel:'SILENT-100',price:67},
    {series:'SILENT',altModel:'SILENT-200',price:98},
    {series:'SILENT',altModel:'SILENT-300',price:127},
    {series:'SILENT DESIGN',altModel:'SILENT-100 DESIGN'}
  ];
  const rows=context.window.VensisSPWorkbookRows;
  const silent=rows.filter(row=>row.series==='SILENT');
  assert.equal(silent.length,8);
  assert.deepEqual(Array.from(silent,row=>row.altModel),expected.map(row=>row[0]));
  assert.ok(rows.some(row=>row.series==='JETLINE'));
  assert.ok(rows.some(row=>row.series==='SILENT DESIGN'));
  assert.equal(rows.some(row=>['SILENT-100','SILENT-200','SILENT-300'].includes(row.altModel)),false);
});

test('confirmed SILENT airflow, controller, prices and variant features are exact',()=>{
  const context=policyContext();
  const rows=context.window.VensisSPSilentPolicy20260908.rows;
  for(const [model,airflow,price,timer,featuresTr] of expected){
    const row=rows.find(item=>item.altModel===model);
    assert.ok(row,model);
    assert.equal(row.maxAirflow,airflow,model);
    assert.equal(row.speedControllerIncluded,'REB-1 N',model);
    assert.equal(row.price,price,model);
    assert.equal(row.timerVariant,timer,model);
    assert.equal(row.featuresTr,featuresTr,model);
  }
});

test('SILENT size technical values are preserved from the existing workbook base rows',()=>{
  const context=policyContext();
  const rows=context.window.VensisSPSilentPolicy20260908.rows;
  for(const row of rows.filter(item=>item.altModel.startsWith('SILENT-100'))){
    assert.equal(row.power,0.008);assert.equal(row.speed,2400);assert.equal(row.voltage,'230 V');assert.equal(row.sound,26.5);
  }
  for(const row of rows.filter(item=>item.altModel.startsWith('SILENT-200'))){
    assert.equal(row.power,0.016);assert.equal(row.speed,2350);assert.equal(row.voltage,'230 V');assert.equal(row.sound,33);
  }
  for(const row of rows.filter(item=>item.altModel.startsWith('SILENT-300'))){
    assert.equal(row.power,0.029);assert.equal(row.speed,1700);assert.equal(row.voltage,'230 V');assert.equal(row.sound,32);
  }
});

test('catalog enrichment exposes controller, timer and bilingual feature metadata',()=>{
  const context=policyContext();
  const rows=context.window.VensisSPSilentPolicy20260908.rows;
  const models=rows.map((row,index)=>({id:`m${index}`,seriesId:'SILENT',model:row.altModel,technical:{},pricing:{},performance:{},motor:{},standard:{}}));
  context.window.VensisCatalog={
    series:[{id:'SILENT',code:'SILENT',title:'SILENT',manufacturer:'Soler & Palau',submodels:[]}],
    models,
    getModel(id){return this.models.find(model=>model.id===id)||null;}
  };
  assert.equal(context.window.VensisSPSilentPolicy20260908.applyCatalog(),true);
  for(const model of models){
    const spec=rows.find(row=>row.altModel===model.model);
    assert.equal(model.technical.speedControllerIncluded,'REB-1 N');
    assert.equal(model.technical.timerVariant,spec.timerVariant);
    assert.equal(model.technical.silentFeaturesTr,spec.featuresTr);
    assert.equal(model.technical.silentFeaturesEn,spec.featuresEn);
    assert.equal(model.pricing.listPrice,spec.price);
    assert.equal(model.performance.nominalAirflow,spec.maxAirflow);
  }
});

test('SILENT authority is loaded before the S&P workbook chunks',()=>{
  const source=read('data/series-overrides.js');
  assert.match(source,/data\/sp-silent-workbook-policy\.js\?v=20260908-silent-r1/);
});

test('fan sitemap uses only the authoritative SILENT model source',()=>{
  const sitemap=read('sitemap-fans.php');
  const authority=read('data/soler-palau-catalog-silent.js');
  assert.match(sitemap,/soler-palau-catalog-silent\.js/);
  assert.match(sitemap,/!\$isSilentAuthority && is_sp_silent_row\(\$row\)/);
  const context={window:{models:[]}};vm.createContext(context);vm.runInContext(authority,context);
  assert.deepEqual(Array.from(context.window.models,row=>row.model),expected.map(row=>row[0]));
});

test('legacy generic SILENT clean URLs 301 to the CZ variants in both languages',()=>{
  const htaccess=read('.htaccess');
  for(const size of ['100','200','300']){
    assert.match(htaccess,new RegExp(`silent/silent-${size}/\\?\\$ \/\\$1/fan/soler-palau/silent/silent-${size}-cz/ \\[R=301,L,NE\\]`));
  }
});
