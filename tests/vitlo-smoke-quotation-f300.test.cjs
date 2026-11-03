const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../js/quotation.js'),'utf8');
const start=source.indexOf('  function localizedModelName(item){');
const end=source.indexOf('  function localizedSeriesTitle(item){',start);
assert.ok(start>=0&&end>start,'Quotation model-label helper must exist');
const modelNameSource=source.slice(start,end);

function quoteName({modelName='AXF 35-2T-1',seriesCode='AXF',brand='Vitlo',fireRating='F300',mode='selection',language='en'}={}){
  const item={model:modelName,manufacturer:brand,mode};
  const model=mode==='custom'?null:{id:'known-product',model:modelName,technical:{fireRating}};
  const catalog={product:()=>model?{series:{code:seriesCode,manufacturer:brand}}:null};
  return vm.runInNewContext(modelNameSource+'\nlocalizedModelName(item)',{
    item,modelFor:()=>model,catalog,quotationLanguage:()=>language,activeQuotation:{settings:{}}
  });
}

test('Vitlo AXF and BOX-AXF show verified F300 after model code in quotations',()=>{
  assert.equal(quoteName(),'AXF 35-2T-1 F300');
  assert.equal(quoteName({modelName:'BOX-AXF 100-4T-20',seriesCode:'BOX-AXF'}),'BOX-AXF 100-4T-20 F300');
  assert.equal(quoteName({language:'tr'}),'AXF 35-2T-1 F300');
});

test('no false F300 labels, duplicates, or changes to other manufacturers and families',()=>{
  assert.equal(quoteName({modelName:'AXF 35-2T-1 F300'}),'AXF 35-2T-1 F300');
  assert.equal(quoteName({fireRating:'F400'}),'AXF 35-2T-1');
  assert.equal(quoteName({fireRating:''}),'AXF 35-2T-1');
  assert.equal(quoteName({brand:'Vortice'}),'AXF 35-2T-1');
  assert.equal(quoteName({modelName:'AXW 50-4T',seriesCode:'AXW'}),'AXW 50-4T');
  assert.equal(quoteName({mode:'custom'}),'AXF 35-2T-1');
});

test('existing language conversion stays intact',()=>{
  assert.equal(quoteName({modelName:'PASLANMAZ 316',seriesCode:'AXW'}),'STAINLESS STEEL 316');
  assert.equal(quoteName({modelName:'STAINLESS STEEL 316',seriesCode:'AXW',language:'tr'}),'PASLANMAZ 316');
});
