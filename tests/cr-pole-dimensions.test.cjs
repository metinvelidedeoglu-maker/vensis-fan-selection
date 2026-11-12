const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const catalogSource=fs.readFileSync(path.join(root,'data/ventilation-catalog.js'),'utf8');
const runtimeSource=fs.readFileSync(path.join(root,'products/ventilation.js'),'utf8');
const series=new Set(['CRS','CRD','CRK','CRS/ATEX','CRD/ATEX','CRK/ATEX']);
const plain=value=>JSON.parse(JSON.stringify(value));

function load(mutate){
  const context={window:{},console};
  vm.createContext(context);
  vm.runInContext(catalogSource,context,{filename:'data/ventilation-catalog.js'});
  const source=context.window.VensisVentilationData;
  if(mutate)mutate(source);
  vm.runInContext(runtimeSource,context,{filename:'products/ventilation.js'});
  return {source,catalog:context.window.VensisCatalog,dimensions:context.window.VensisDimensions};
}

test('verified CR casing measurements backfill 59 empty technical dimension fields',()=>{
  const {source,catalog}=load();
  let filled=0,unsupported=0;
  for(const original of source.models.filter(model=>series.has(model.seriesId))){
    const current=catalog.getModel(original.id);
    if(/\b(?:STAINLESS|PASLANMAZ)\b/i.test(original.model)){
      assert.deepEqual(plain(current.technical.dimensions),plain(original.technical.dimensions),'stainless variants stay unchanged');
      continue;
    }
    const existing=original.technical.dimensions||{};
    const verified=original.dimensions?.values||{};
    if(!Object.keys(existing).length&&Object.keys(verified).length){
      filled++;
      assert.deepEqual(plain(current.technical.dimensions),plain(verified),original.model);
      assert.deepEqual(plain(original.technical.dimensions),{},original.model+' source must remain unchanged');
    }else if(!Object.keys(existing).length){
      unsupported++;
      assert.equal(Object.keys(current.technical.dimensions||{}).length,0,original.model);
    }else{
      assert.deepEqual(plain(current.technical.dimensions),plain(existing),original.model);
    }
    assert.equal(current.id,original.id);
    assert.equal(current.pricing.listPrice,original.pricing.listPrice);
  }
  assert.equal(filled,58);
  assert.equal(unsupported,18);
});

test('same-series and same-body 2T/4T models share published casing dimensions',()=>{
  const {catalog}=load();
  const groups=new Map();
  for(const model of catalog.models.filter(model=>series.has(model.seriesId)&&!model.model.includes('STAINLESS'))){
    const match=model.model.match(/(?:^|\s)(\d+)-([24])T(?=-|\s|$)/i);
    if(!match)continue;
    const key=model.seriesId+'|'+Number(match[1]);
    const group=groups.get(key)||{};
    group[match[2]]=model;
    groups.set(key,group);
  }
  let checked=0;
  for(const [key,pair] of groups){
    if(!pair['2']||!pair['4'])continue;
    const two=pair['2'].dimensions?.values||{};
    const four=pair['4'].dimensions?.values||{};
    if(!Object.keys(two).length||!Object.keys(four).length)continue;
    assert.deepEqual(plain(two),plain(four),key);
    checked++;
  }
  assert.ok(checked>=25,'Expected shared body size rows across CR series');
});

test('a missing 2T record gets only the matching 4T dimensions, without crossing series',()=>{
  const {catalog,dimensions}=load(source=>{
    const target=source.models.find(model=>model.model==='CRD 40-2T-5.5');
    assert.ok(target);
    target.dimensions=null;
    target.technical.dimensions={};
  });
  const donor=catalog.models.find(model=>model.model==='CRD 40-4T');
  const filled=catalog.models.find(model=>model.model==='CRD 40-2T-5.5');
  assert.ok(filled.dimensions);
  assert.deepEqual(plain(filled.dimensions.values),plain(donor.dimensions.values));
  assert.deepEqual(plain(filled.technical.dimensions),plain(donor.dimensions.values));
  assert.deepEqual(plain(dimensions.resolve({},filled).values),plain(donor.dimensions.values));
  // CRK/ATEX has no independently confirmed dimensions; CRK data is not borrowed.
  const crkAtex=catalog.models.find(model=>model.model==='CRK/ATEX 40-2T-5.5');
  assert.equal(crkAtex.dimensions,null);
  assert.deepEqual(plain(crkAtex.technical.dimensions),{});
});

test('missing measurements never borrow from CRS, CRK, other ATEX cases or different bodies',()=>{
  const {catalog}=load(source=>{
    for(const model of source.models.filter(m=>m.seriesId==='CRD'&&/\b40-[24]T/.test(m.model))){
      model.dimensions=null;
      model.technical.dimensions={};
    }
  });
  for(const model of catalog.models.filter(m=>m.seriesId==='CRD'&&/\b40-[24]T/.test(m.model))){
    assert.equal(model.dimensions,null,model.model);
    assert.deepEqual(plain(model.technical.dimensions),{},model.model);
  }
});

test('previously supplied CRS 2T technical values are not silently overwritten',()=>{
  const {catalog}=load();
  const m40=catalog.models.find(m=>m.model==='CRS/ATEX 40-2T-5.5');
  const m56=catalog.models.find(m=>m.model==='CRS/ATEX 56-2T-20');
  assert.equal(m40.technical.dimensions.C,650);
  assert.equal(m40.dimensions.values.C,590);
  assert.equal(m56.technical.dimensions.C,870);
  assert.equal(m56.dimensions.values.C,795);
});

test('the 2T/4T rule never changes unrelated series or stainless constructions',()=>{
  const {catalog}=load(source=>{
    const stainless=source.models.find(m=>m.model==='CRS/ATEX 45-4T STAINLESS STEEL 316');
    assert.ok(stainless);
    stainless.dimensions=null;
    stainless.technical.dimensions={};
    const axial=source.models.find(m=>m.seriesId==='AXF');
    assert.ok(axial);
    axial.technical.dimensions={};
  });
  const stainless=catalog.models.find(m=>m.model==='CRS/ATEX 45-4T STAINLESS STEEL 316');
  assert.equal(stainless.dimensions,null);
  assert.deepEqual(plain(stainless.technical.dimensions),{});
  const axial=catalog.models.find(m=>m.seriesId==='AXF');
  assert.deepEqual(plain(axial.technical.dimensions),{});
});
