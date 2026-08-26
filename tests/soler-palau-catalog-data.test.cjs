const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');

const root=path.resolve(__dirname,'..');

function loadCatalog(){
  const context=vm.createContext({window:{models:[]},console});
  for(const file of ['soler-palau-catalog.js','soler-palau-catalog-2.js','soler-palau-catalog-3.js']){
    vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),context,{filename:file});
  }
  const imported=context.window.models;
  vm.runInContext(fs.readFileSync(path.join(root,'products/registry.js'),'utf8'),context,{filename:'registry.js'});
  return {catalog:context.window.VensisCatalog,imported};
}

test('Soler & Palau import creates a broad catalog and verified selection range',()=>{
  const {catalog,imported}=loadCatalog();
  const series=catalog.series.filter(item=>item.manufacturer==='Soler & Palau');
  const models=catalog.models.filter(item=>series.some(group=>group.id===item.seriesId));

  assert.equal(series.length,47);
  assert.ok(models.length>=900);
  assert.equal(models.length,imported.length);
  assert.equal(models.filter(model=>!model.catalogOnly).length,71);
  assert.equal(models.filter(model=>model.catalogOnly).length,models.length-71);
  assert.ok(models.filter(model=>!model.catalogOnly).every(model=>model.performance.sourcePoints.length>=10));
  assert.ok(series.every(group=>group.modelIds.length>0));
});

test('Soler & Palau series images exist and key technical rows are preserved',()=>{
  const {catalog}=loadCatalog();
  const series=catalog.series.filter(item=>item.manufacturer==='Soler & Palau');
  for(const group of series){
    assert.ok(group.media.image.startsWith('assets/products/soler-palau/'));
    assert.ok(fs.existsSync(path.join(root,group.media.image)),`missing ${group.media.image}`);
  }

  const cab=catalog.models.find(model=>model.model==='CAB-100');
  assert.equal(cab.motor.power,0.045);
  assert.equal(cab.performance.nominalAirflow,205);
  const vent=catalog.models.find(model=>model.model==='VENT-100NK');
  assert.equal(vent.motor.speed,2600);
  assert.equal(vent.performance.nominalAirflow,290);
  assert.equal(vent.catalogOnly,false);
  assert.equal(vent.performance.curves[0].sourcePage,3);
  assert.ok(vent.performance.sourcePoints.length>=10);

  const jetline=catalog.models.find(model=>model.model==='JETLINE-315');
  assert.equal(jetline.motor.power,0.215);
  assert.equal(jetline.performance.nominalAirflow,1610);
  assert.equal(jetline.catalogOnly,false);
  assert.ok(jetline.performance.sourcePoints.at(0)[0]>400);

  const hxm=catalog.models.find(model=>model.model==='HXM-400');
  assert.equal(hxm.motor.power,0.151);
  assert.equal(hxm.performance.nominalAirflow,3670);
  assert.equal(hxm.catalogOnly,false);

  const ventThreePhase=catalog.models.find(model=>model.model==='VENT-355N T');
  assert.equal(ventThreePhase.motor.power,0.27);
  assert.equal(ventThreePhase.performance.nominalAirflow,2640);
  assert.equal(ventThreePhase.motor.sound,43);

  const tdSilent=catalog.models.find(model=>model.model==='TD-1300/250 SILENT');
  assert.equal(tdSilent.catalogOnly,false);
  assert.deepEqual([...tdSilent.performance.controls],['HS','MS','LS']);
  assert.equal(
    JSON.stringify(tdSilent.performance.operatingPoints.map(point=>[point.control,point.power,point.nominalAirflow])),
    JSON.stringify([['HS',0.204,1320],['MS',0.163,1160],['LS',0.144,1040]])
  );

  const eco=catalog.models.find(model=>model.model==='TD EVO-315 PF ECOWATT');
  assert.deepEqual([...eco.performance.controls],['10V','8V','6V','4V']);
  assert.equal(eco.performance.operatingPoints[0].power,0.225);
});

test('catalog, selection and document pages load the Soler & Palau dataset before the registry',()=>{
  for(const file of ['catalog.html','fan-selection.html','project.html','project-print.html','quotation.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const dataIndex=html.indexOf('data/soler-palau-catalog.js');
    const data2Index=html.indexOf('data/soler-palau-catalog-2.js');
    const data3Index=html.indexOf('data/soler-palau-catalog-3.js');
    const registryIndex=html.indexOf('products/registry.js');
    assert.ok(dataIndex>=0,`${file} does not load the Soler & Palau catalog`);
    assert.ok(data2Index>dataIndex&&data3Index>data2Index&&registryIndex>data3Index,`${file} loads registry before every Soler & Palau catalog chunk`);
    assert.equal((html.match(/data\/soler-palau-catalog(?:-[23])?\.js\?v=20260826-soler-palau-r3/g)||[]).length,3,`${file} does not bust every S&P data cache`);
    assert.match(html,/products\/registry\.js\?v=20260826-soler-palau-r4/,`${file} does not bust the registry cache`);
  }
});

test('verified Soler & Palau curve artifact is traceable and contains no extrapolation',()=>{
  const artifact=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/verified-vector-curves.json'),'utf8'));
  assert.equal(artifact.status,'verified_against_original_catalogue_vector_graphs');
  assert.equal(artifact.extrapolation,false);
  assert.equal(artifact.summary.models,71);
  assert.equal(artifact.summary.curves,143);
  assert.equal(artifact.sources.length,11);
  assert.ok(artifact.sources.every(source=>/^[a-f0-9]{64}$/.test(source.sha256)));
  for(const row of Object.values(artifact.models)){
    assert.ok(row.sourcePoints.length>=10);
    assert.ok(row.maxAirflowM3h>0);
    assert.ok(row.maxPressurePa>0);
    assert.ok(row.curves.length>=1);
    assert.ok(row.curves.every(curve=>curve.sourcePoints.length>=10));
  }
});

test('verified Soler & Palau curves participate in fan selection',()=>{
  const values={q:150,p:200,qmin:-50,qmax:50,pmin:-50,pmax:50};
  const context=vm.createContext({
    window:{models:[]},
    document:{getElementById:id=>({value:values[id]??0})},
    console,
    Intl,
  });
  for(const file of [
    'data/soler-palau-catalog.js',
    'data/soler-palau-catalog-2.js',
    'data/soler-palau-catalog-3.js',
    'products/registry.js',
    'js/core/utils.js',
    'js/core/state.js',
    'js/core/selection-engine.js',
  ]){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  context.window.VensisState.selectedManufacturers=new Set(['Soler & Palau']);
  const selection=context.window.VensisSelection.select();
  assert.ok(selection.results.length>0);
  assert.ok(selection.results.every(model=>model.manufacturer==='Soler & Palau'));
  assert.ok(selection.results.some(model=>['CAB','JETLINE','VENT-NK / VENT-N'].includes(model.series)));
});
