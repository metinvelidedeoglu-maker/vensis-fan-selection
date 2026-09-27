const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

function loadDimensions(){
  const code=fs.readFileSync(path.join(__dirname,'..','data','vitlo-dimensions.js'),'utf8');
  const context={window:{},console};
  vm.createContext(context);
  vm.runInContext(code,context);
  return context.window.VensisVitloDimensions;
}

const api=loadDimensions();

test('Vitlo dimension registry covers the catalog families with dimension tables',()=>{
  assert.ok(api);
  assert.equal(Object.keys(api.families).length,37);
  for(const [series,definition] of Object.entries(api.families)){
    assert.ok(definition.page>0,`${series} catalogue page is missing`);
    assert.ok(Array.isArray(definition.headers)&&definition.headers.length>0,`${series} headers are missing`);
    assert.ok(Object.keys(definition.rows||{}).length>0,`${series} dimension rows are missing`);
  }
});

test('AXF 35 technical output resolves exact body dimensions',()=>{
  const dim=api.resolve('AXF',{model:'AXF 35-2T-1',performance:{nominalAirflow:4000}});
  assert.ok(dim);
  assert.equal(dim.referenceModel,'35');
  assert.deepEqual(
    Object.fromEntries(Object.entries(dim.values)),
    {'ØD':355,'ØB':392,'ØA':435,'N × ØJ':'8 × Ø11','E':400}
  );
});

test('rectangular Vitlo models resolve by duct size rather than motor suffix',()=>{
  const dim=api.resolve('CRB',{model:'CRB 600X400-4T-1.5'});
  assert.ok(dim);
  assert.equal(dim.referenceModel,'600X400');
  assert.deepEqual(Object.fromEntries(Object.entries(dim.values)),{A:400,B:600,C:600,H:460});
});

test('RXJ dimension variants resolve from performance size',()=>{
  const low=api.resolve('RXJ',{model:'RXJ 50/100',performance:{nominalAirflow:6000},motor:{power:1.5}});
  const high=api.resolve('RXJ',{model:'RXJ 50/100',performance:{nominalAirflow:12000},motor:{power:4}});
  assert.equal(low.referenceModel,'LOW');
  assert.equal(high.referenceModel,'HIGH');
  assert.equal(low.values.A,290);
  assert.equal(high.values.A,330);
});

test('unknown Vitlo series or unsupported body size does not invent dimensions',()=>{
  assert.equal(api.resolve('UNKNOWN',{model:'UNKNOWN 35'}),null);
  assert.equal(api.resolve('AXF',{model:'AXF 999-4T-1'}),null);
});
