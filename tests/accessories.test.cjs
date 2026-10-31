const assert=require('node:assert/strict');
const core=require('../js/accessory-core.js');
require('../data/accessories-catalog.js');

const fanA={itemKey:'fan-a',productType:'fan',model:'Fan A'};
const fanB={itemKey:'fan-b',productType:'fan',model:'Fan B'};
const electrical={itemKey:'electrical|1',productType:'electrical',model:'Lamp'};
const accessory={id:'accessory-1',model:'Accessory 1',category:'Hız Kontrolü',manufacturer:'AVenS',price:85,specs:'220–240 V • 50 Hz • IP56'};

let items=[fanA,fanB,electrical];
let first=core.insertAccessory(items,'fan-a',accessory,{itemKey:'acc-line-1',now:'2026-09-07T12:00:00.000Z'});
assert.equal(first.items.length,4);
assert.equal(first.items[1].itemKey,'acc-line-1');
assert.equal(first.items[1].productType,'accessory');
assert.equal(first.items[1].parentItemKey,'fan-a');
assert.equal(first.items[1].quantity,1);
assert.equal(Object.hasOwn(first.items[1],'orderCode'),false);
assert.equal(Object.hasOwn(first.items[1],'accessoryId'),false);
assert.equal(first.items[1].description,accessory.specs,'catalogue technical summary becomes the editable line description');

let second=core.insertAccessory(first.items,'fan-a',accessory,{itemKey:'acc-line-2',now:'2026-09-07T12:01:00.000Z'});
assert.equal(second.items.length,5,'adding the same accessory again must append another line');
assert.equal(second.items[1].itemKey,'acc-line-1');
assert.equal(second.items[2].itemKey,'acc-line-2');
assert.equal(second.items[1].quantity,1);
assert.equal(second.items[2].quantity,1);

const legacy=[{itemKey:'legacy-accessory',productType:'accessory',description:'Eski ürün notu'}];
assert.equal(core.purgeAccessoryNotes(legacy),false);
assert.equal(legacy[0].description,'Eski ürün notu');

const typeOf=item=>item.productType==='electrical'?'electrical':'fan';
const moved=core.reorderFanBlock(second.items,'fan-a',1,typeOf);
const fanSequence=moved.filter(item=>item.productType!=='electrical').map(item=>item.itemKey);
assert.deepEqual(fanSequence,['fan-b','fan-a','acc-line-1','acc-line-2'],'fan accessories must move with their parent fan');
assert.equal(moved.findIndex(item=>item.itemKey==='electrical|1'),second.items.findIndex(item=>item.itemKey==='electrical|1'),'electrical slot must stay in place');

const technical=core.technicalItems(second.items);
assert.deepEqual(technical.map(item=>item.itemKey),['fan-a','fan-b','electrical|1'],'accessories must not create technical datasheets');

const catalog=globalThis.VensisAccessoriesCatalog;
assert.ok(catalog&&Array.isArray(catalog.items)&&catalog.items.length>20,'accessory catalog should be populated');
assert.ok(catalog.items.some(item=>item.category==='Frekans İnverteri'));
assert.ok(catalog.items.some(item=>item.category==='Hız Kontrolü'));
assert.ok(catalog.items.some(item=>item.category==='Sensör / Otomasyon'));
assert.ok(catalog.items.some(item=>item.category==='Mekanik Kit'));
assert.ok(catalog.items.every(item=>!Object.hasOwn(item,'code')),'catalog must not retain accessory codes');
assert.ok(catalog.items.every(item=>!/^\d+-/.test(String(item.id||''))),'internal accessory ids must not retain catalog codes');
assert.equal(new Set(catalog.items.map(item=>item.id)).size,catalog.items.length,'accessory ids must stay unique');
assert.equal(catalog.items.some(item=>/quadro\s*evo/i.test(`${item.model} ${item.specs||''}`)),false,'QUADRO EVO accessories must stay out of this catalog');

const fs=require('node:fs');
const path=require('node:path');
const accessoryPage=fs.readFileSync(path.resolve(__dirname,'../js/accessories-page.js'),'utf8');
assert.ok(accessoryPage.includes('enabled&&canQuote(item)'),'add button must honor quoteable status');
assert.ok(accessoryPage.includes('!accessory||!canQuote(accessory)'),'project-add logic must reject unquoteable accessories');

console.log('Accessory workflow tests passed.');
