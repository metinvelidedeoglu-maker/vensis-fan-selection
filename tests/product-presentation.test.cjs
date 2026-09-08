const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function registry(models=[]){
  const window={models};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../products/registry.js'),'utf8'),{window,Map,Set,Number,String,Array,Object,Boolean});
  return window.VensisProducts;
}

test('central product presentation always returns submodel, clean description and brand',()=>{
  const products=registry([]);
  const value=products.presentation({
    productKey:'legacy-lineo-record',
    model:'LINEO 100 QUIET',
    series:'LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',
    manufacturer:'Vortice'
  });
  assert.deepEqual({...value},{
    altModel:'LINEO 100 QUIET',
    description:'Low-Noise In-Line Mixed-Flow Fans',
    brand:'Vortice'
  });
});

test('a newly added catalog series follows the presentation without product-specific code',()=>{
  const products=registry([{
    key:'future-x-100',seriesCode:'FUTURE X',series:'FUTURE X',
    catalogNameEn:'FUTURE X Smart In-Line Fan',model:'FUTURE X 100',brand:'Future Brand'
  }]);
  const value=products.presentation({
    productKey:'future-x-100',model:'FUTURE X 100',
    series:'FUTURE X Smart In-Line Fan',manufacturer:'Future Brand'
  });
  assert.deepEqual({...value},{
    altModel:'FUTURE X 100',
    description:'Smart In-Line Fan',
    brand:'Future Brand'
  });
});

test('descriptions without a repeated series code are left untouched',()=>{
  const products=registry([]);
  const value=products.presentation({
    productType:'electrical',model:'ZNF.2X18W.EM',
    series:'Acil Kitli Floresan (Kısa)',manufacturer:'ZONEX'
  });
  assert.equal(value.description,'Acil Kitli Floresan (Kısa)');
});
