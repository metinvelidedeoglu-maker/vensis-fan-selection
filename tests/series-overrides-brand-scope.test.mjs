import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../data/series-overrides.js',import.meta.url),'utf8');

function writesFor(brand){
  const writes=[];
  const context={
    window:{},
    document:{
      write:(...parts)=>writes.push(parts.join('')),
      readyState:'loading',
      addEventListener:()=>{},
      querySelectorAll:()=>[]
    },
    MutationObserver:class{observe(){}},
  };
  if(brand!==undefined)context.window.VensisCatalogBrand=brand;
  vm.createContext(context);
  vm.runInContext(code,context,{filename:'data/series-overrides.js'});
  return writes.join('\n');
}

test('Vitlo catalog loads CR matrix extras but not Soler & Palau roof files',()=>{
  const out=writesFor('vitlo');
  assert.match(out,/cr-family-matrix\.js/);
  assert.doesNotMatch(out,/sp-roof-/);
});

test('Soler & Palau catalog loads roof files but not Vitlo CR matrix extras',()=>{
  const out=writesFor('sp');
  assert.match(out,/sp-roof-01\.js/);
  assert.doesNotMatch(out,/cr-family-matrix\.js/);
  assert.doesNotMatch(out,/fans-16\.js/);
  assert.doesNotMatch(out,/fans-17\.js/);
});

test('legacy unscoped catalog still loads both families',()=>{
  const out=writesFor(undefined);
  assert.match(out,/cr-family-matrix\.js/);
  assert.match(out,/sp-roof-01\.js/);
});
