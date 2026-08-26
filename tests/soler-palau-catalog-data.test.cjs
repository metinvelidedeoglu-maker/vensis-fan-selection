const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');

const root=path.resolve(__dirname,'..');

function loadCatalog(){
  const context=vm.createContext({window:{models:[]},console});
  vm.runInContext(fs.readFileSync(path.join(root,'data/soler-palau-catalog.js'),'utf8'),context,{filename:'soler-palau-catalog.js'});
  const imported=context.window.models;
  vm.runInContext(fs.readFileSync(path.join(root,'products/registry.js'),'utf8'),context,{filename:'registry.js'});
  return {catalog:context.window.VensisCatalog,imported};
}

test('Soler & Palau import creates a broad catalog-only product range',()=>{
  const {catalog,imported}=loadCatalog();
  const series=catalog.series.filter(item=>item.manufacturer==='Soler & Palau');
  const models=catalog.models.filter(item=>series.some(group=>group.id===item.seriesId));

  assert.equal(series.length,47);
  assert.ok(models.length>=900);
  assert.equal(models.length,imported.length);
  assert.ok(models.every(model=>model.catalogOnly));
  assert.ok(models.every(model=>model.performance.points.length===0));
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
});

test('catalog and document pages load the Soler & Palau dataset before the registry',()=>{
  for(const file of ['catalog.html','project.html','project-print.html','quotation.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const dataIndex=html.indexOf('data/soler-palau-catalog.js');
    const registryIndex=html.indexOf('products/registry.js');
    assert.ok(dataIndex>=0,`${file} does not load the Soler & Palau catalog`);
    assert.ok(registryIndex>dataIndex,`${file} loads registry before the Soler & Palau catalog`);
    assert.match(html,/products\/registry\.js\?v=20260826-soler-palau-r2/,`${file} does not bust the registry cache`);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root,'fan-selection.html'),'utf8'),/soler-palau-catalog\.js/);
});
