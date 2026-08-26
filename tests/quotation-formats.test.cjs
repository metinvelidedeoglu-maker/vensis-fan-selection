const test=require('node:test');
const assert=require('node:assert/strict');
const formats=require('../js/quotation-formats.js');

const fan={itemKey:'fan|axw',model:'AXW 50-4T',manufacturer:'Vitlo'};
const electrical={itemKey:'electrical|ZNF._S|ZNF.22W.S',productType:'electrical',model:'ZNF.22W.S',manufacturer:'ZONEX',orderCode:'101109'};

test('legacy and explicitly tagged products resolve to the correct quotation type',()=>{
  assert.equal(formats.itemType(fan),'fan');
  assert.equal(formats.itemType(electrical),'electrical');
  assert.equal(formats.itemType({manufacturer:'ZONEX'}),'electrical');
  assert.equal(formats.itemType({ip:'IP66'}),'electrical');
});

test('automatic quotation format follows project contents',()=>{
  assert.equal(formats.detect([fan]),'fan');
  assert.equal(formats.detect([electrical]),'electrical');
  assert.equal(formats.detect([fan,electrical]),'mixed');
});

test('manual quotation format overrides automatic detection',()=>{
  assert.equal(formats.detect([fan],'electrical'),'electrical');
  assert.equal(formats.detect([electrical],'fan'),'fan');
  assert.equal(formats.detect([fan],'mixed'),'mixed');
  assert.equal(formats.preference('unknown'),'auto');
});

test('mixed quotation groups keep fan and electrical items separate',()=>{
  const groups=formats.split([electrical,fan,{...fan,itemKey:'fan|second'}]);
  assert.deepEqual(groups.electrical,[electrical]);
  assert.equal(groups.fan.length,2);
});
