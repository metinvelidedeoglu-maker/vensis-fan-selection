const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

function catalog(){
  const window={};
  const context={window,console,Intl};
  vm.runInNewContext(read('data/ventilation-catalog.js'),context);
  const data=window.VensisVentilationData;
  const original=new Map(data.models.map(m=>[m.id,{model:m.model,display:m.display,altModel:m.altModel,productCode:m.technical?.productCode}]));
  vm.runInNewContext(read('data/ventilation-vitlo-axf-f300-codes.js'),context);
  vm.runInNewContext(read('products/ventilation.js'),context);
  return {window,data,original,context};
}
test('verified Vitlo AXF and BOX-AXF product codes contain F300 in shared catalog',()=>{
  const {window,data,original}=catalog();
  const series=new Map(data.series.map(s=>[s.id,s]));
  const eligible=data.models.filter(m=>series.get(m.seriesId)?.manufacturer==='Vitlo'
    &&['AXF','BOX-AXF'].includes(series.get(m.seriesId).code)
    &&m.technical?.fireRating==='F300');
  assert.equal(eligible.length,96);
  assert.equal(eligible.filter(m=>m.seriesId==='AXF').length,48);
  assert.equal(eligible.filter(m=>m.seriesId==='BOX-AXF').length,48);
  for(const model of eligible){
    const before=original.get(model.id);
    assert.equal(model.model,before.model+' F300',model.id);
    assert.equal(model.display,model.model);
    assert.equal(model.altModel,model.model);
    assert.equal(model.technical.productCode,model.model);
    assert.equal(model.legacyModelCode,before.model);
    assert.equal(window.VensisCatalog.getModel(model.id).model,model.model);
    assert.equal(window.VensisCatalog.product(model.id).model,model.model);
    const duplicateCount=data.models.filter(other=>other.seriesId===model.seriesId&&original.get(other.id).model===before.model).length;
    const originalSlug=window.VensisCatalog.slug(duplicateCount>1?model.id:before.model);
    assert.equal(window.VensisCatalog.modelSlug(model),originalSlug,'old product link must stay stable');
    assert.equal(model.model.match(/\bF300\b/g).length,1);
  }
  const example=eligible.find(m=>m.id==='AXF|AXF 35-2T-1|4000|4');
  assert.equal(example.model,'AXF 35-2T-1 F300');
});
test('other manufacturers/series, all stable keys, and F300 ratings remain untouched',()=>{
  const {data,original,context}=catalog();
  const series=new Map(data.series.map(s=>[s.id,s]));
  assert.equal(data.models.length,1022);
  for(const m of data.models){
    const s=series.get(m.seriesId);
    const target=s?.manufacturer==='Vitlo'&&['AXF','BOX-AXF'].includes(s.code)&&m.technical?.fireRating==='F300';
    if(!target){
      assert.equal(m.model,original.get(m.id).model,m.id);
      assert.equal(m.display,original.get(m.id).display,m.id);
      assert.equal(m.technical?.productCode,original.get(m.id).productCode,m.id);
    }
  }
  const previous=data.models.map(m=>m.model).join('|');
  vm.runInNewContext(read('data/ventilation-vitlo-axf-f300-codes.js'),context);
  assert.equal(data.models.map(m=>m.model).join('|'),previous,'rerunning does not duplicate F300');
});
test('quotation-specific F300 suffix logic was removed',()=>{
  const quote=read('js/quotation.js');
  const begin=quote.indexOf('  function localizedModelName(item){');
  const end=quote.indexOf('  function localizedSeriesTitle(item){',begin);
  assert.ok(begin>=0&&end>begin);
  const method=quote.slice(begin,end);
  assert.doesNotMatch(method,/F300|fireRating|catalog\.product|modelFor/);
});
