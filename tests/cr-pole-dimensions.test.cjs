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

test('verified and user-confirmed shared CR casing measurements fill only missing fields',()=>{
  const {source,catalog}=load();
  let filled=0,shared=0,unsupported=0;
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
      const transferred=current.dimensions?.values||{};
      if(Object.keys(transferred).length){
        shared++;
        assert.deepEqual(plain(current.technical.dimensions),plain(transferred),original.model);
        assert.ok(current.dimensions.inheritedFromModel,original.model+' must record source model');
        assert.equal(original.dimensions,null,original.model+' original source stays unchanged');
      }else{
        unsupported++;
        assert.equal(Object.keys(current.technical.dimensions||{}).length,0,original.model);
      }
    }else{
      assert.deepEqual(plain(current.technical.dimensions),plain(existing),original.model);
    }
    assert.equal(current.id,original.id);
    assert.equal(current.pricing.listPrice,original.pricing.listPrice);
  }
  assert.equal(filled,58);
  assert.equal(shared,14);
  assert.equal(unsupported,4);
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
  // User confirmed the standard and ATEX versions have identical casing dimensions.
  const crkAtex=catalog.models.find(model=>model.model==='CRK/ATEX 40-2T-5.5');
  const crkStandard=catalog.models.find(model=>model.model==='CRK 40-4T');
  assert.deepEqual(plain(crkAtex.dimensions.values),plain(crkStandard.dimensions.values));
  assert.deepEqual(plain(crkAtex.technical.dimensions),plain(crkStandard.dimensions.values));
  assert.equal(crkAtex.dimensions.inheritedFromModel,'CRK 40-4T');
  assert.equal(crkAtex.media.dimensionImage,crkStandard.media.dimensionImage);
});

test('missing measurements never borrow from other construction families or body sizes',()=>{
  const {catalog}=load(source=>{
    // Remove both standard and ATEX CRD body-40 sources. CRS/CRK cannot fill them.
    for(const model of source.models.filter(m=>/^CRD(?:\/ATEX)?$/.test(m.seriesId)&&/\b40-[24]T/.test(m.model))){
      model.dimensions=null;
      model.technical.dimensions={};
    }
  });
  for(const model of catalog.models.filter(m=>/^CRD(?:\/ATEX)?$/.test(m.seriesId)&&/\b40-[24]T/.test(m.model))){
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

test('standard and ATEX CR dimensions match, leaving the four body-80 unknowns untouched',()=>{
  const {source,catalog}=load();
  const bodies=new Map();
  for(const model of catalog.models.filter(m=>series.has(m.seriesId)&&!/STAINLESS|PASLANMAZ/i.test(m.model))){
    const match=model.model.match(/(?:^|\s)(\d+)-([24])T(?=-|\s|$)/i);
    if(!match)continue;
    const key=model.seriesId.replace(/\/ATEX$/,'')+'|'+match[1];
    if(!bodies.has(key))bodies.set(key,[]);
    bodies.get(key).push(model);
  }
  for(const [key,items] of bodies){
    const expected=items.map(x=>x.dimensions?.values||{}).filter(x=>Object.keys(x).length);
    if(!expected.length)continue;
    for(const entry of items)
      assert.deepEqual(plain(entry.dimensions.values),plain(expected[0]),entry.model+' '+key);
  }
  const unknown=['CRK 80-4T-25','CRK/ATEX 80-4T-25','CRD 80-4T-25','CRD/ATEX 80-4T-25'];
  for(const modelName of unknown){
    const model=catalog.models.find(x=>x.model===modelName);
    assert.ok(model,modelName);
    assert.equal(model.dimensions,null,modelName);
    assert.deepEqual(plain(model.technical.dimensions),{});
  }
  for(const original of source.models){
    const current=catalog.getModel(original.id);
    assert.equal(current.id,original.id);
    assert.equal(current.pricing.listPrice,original.pricing.listPrice);
    assert.deepEqual(plain(current.motor),plain(original.motor),original.model);
    assert.deepEqual(plain(current.performance),plain(original.performance),original.model);
  }
});
