const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const policy=require('../js/linked-accessory-order.js');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const fanA={itemKey:'fan-a',productType:'fan',model:'Fan A'};
const fanB={itemKey:'fan-b',productType:'fan',model:'Fan B'};
const electrical={itemKey:'electrical|1',productType:'electrical',model:'Independent Electrical Product'};
const accessoryA={itemKey:'acc-a',productType:'accessory',mode:'accessory',parentItemKey:'fan-a',orderCode:'12967',model:'C 2,5 Hız Anahtarı'};
const accessoryB={itemKey:'acc-b',productType:'accessory',mode:'accessory',parentItemKey:'fan-b',orderCode:'12966',model:'C 1,5 Hız Anahtarı'};

test('existing accessories stored at the bottom are restored directly below their parent fan',()=>{
  const oldOrder=[fanA,fanB,electrical,accessoryA,accessoryB];
  const next=policy.normalizeItems(oldOrder);
  assert.deepEqual(next.map(item=>item.itemKey),['fan-a','acc-a','fan-b','acc-b','electrical|1']);
});

test('linked accessories belong to the fan quotation group even when they have an order code',()=>{
  const formats={
    preference:value=>['auto','fan','electrical','mixed'].includes(String(value||'').toLowerCase())?String(value).toLowerCase():'auto',
    itemType:item=>item.productType==='electrical'||item.orderCode?'electrical':'fan',
    split(items){return items.reduce((groups,item)=>{groups[this.itemType(item)].push(item);return groups},{fan:[],electrical:[]})},
    detect(){return 'electrical'}
  };
  policy.patchFormats(formats);
  assert.equal(formats.itemType(accessoryA),'fan');
  const groups=formats.split([fanA,accessoryA,electrical]);
  assert.deepEqual(groups.fan.map(item=>item.itemKey),['fan-a','acc-a']);
  assert.deepEqual(groups.electrical.map(item=>item.itemKey),['electrical|1']);
  assert.equal(formats.detect([fanA,accessoryA,electrical],'auto'),'mixed');
  assert.equal(formats.detect([fanA,accessoryA],'auto'),'fan');
});

test('project and quotation pages load the linked accessory ordering policy',()=>{
  const overrides=read('data/series-overrides.js');
  assert.match(overrides,/\(project\|quotation\)\\\.html/);
  assert.match(overrides,/js\/linked-accessory-order\.js\?v=20260908-r1/);
});
