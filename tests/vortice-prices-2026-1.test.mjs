import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const priceFile='data/vortice-prices-2026-1.js';

function parseDataFile(name){
  const source=fs.readFileSync(path.join(root,'data',name),'utf8');
  const match=source.match(/^\s*window\.models\.push\(\.\.\.(\[.*\])\);?\s*$/s);
  assert.ok(match,`Unsupported data wrapper in ${name}`);
  return JSON.parse(match[1]);
}

function vorticeRows(){
  return Array.from({length:6},(_,index)=>parseDataFile(`fans-${String(index+9).padStart(2,'0')}.js`)).flat();
}

function priceList(){
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,priceFile),'utf8'),context,{filename:priceFile});
  return context.window.VensisVorticePriceList2026_1;
}

function applicationHarness(explicitPrice=null){
  const document={getElementById:()=>({value:'0'})};
  const context={window:{models:[]},document,console,Intl};
  context.window.document=document;
  vm.createContext(context);
  for(const file of fs.readdirSync(path.join(root,'data')).filter(name=>/^fans-\d+\.js$/.test(name)).sort()){
    vm.runInContext(fs.readFileSync(path.join(root,'data',file),'utf8'),context,{filename:file});
  }
  if(explicitPrice!=null){
    const row=context.window.models.find(item=>item.key==='VORTICE-LINEO|17180|LINEO 200');
    row.price=explicitPrice;
  }
  for(const file of ['data/series-overrides.js',priceFile,'products/registry.js','js/core/utils.js','js/core/state.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  }
  return context;
}

test('2026.1 list contains only exact audited Vortice matches',()=>{
  const prices=priceList();
  const rows=vorticeRows();
  const rowsByKey=new Map(rows.map(row=>[row.key,row]));

  assert.equal(prices.catalog,'Vensis Urun Fiyat Katalogu 2026.1');
  assert.equal(prices.currency,'EUR');
  assert.deepEqual({...prices.source},{
    file:'Vensis Fiyat Listesi 2026.pdf',
    sha256:'e914684a173ff6aa174f31b342b69c123c6985781fbe1d4fd492b887b4b716e2',
    pages:47
  });
  assert.equal(rows.length,310);
  assert.equal(prices.totalVorticeProducts,310);
  assert.equal(prices.matchedProducts,153);
  assert.equal(prices.unpricedProducts,157);
  assert.equal(prices.entries.length,153);
  assert.equal(new Set(prices.entries.map(entry=>entry.productKey)).size,153);

  for(const entry of prices.entries){
    const row=rowsByKey.get(entry.productKey);
    assert.ok(row,entry.productKey);
    assert.equal(row.brand,'Vortice');
    assert.equal(entry.series,row.series,entry.productKey);
    assert.equal(entry.productCode,row.productCode,entry.productKey);
    assert.equal(entry.model,row.model,entry.productKey);
    assert.ok(Number.isFinite(entry.listPrice)&&entry.listPrice>0,entry.productKey);
    assert.ok(Number.isInteger(entry.sourcePage)&&entry.sourcePage>=2&&entry.sourcePage<=29,entry.productKey);
  }

  assert.deepEqual(
    Object.fromEntries(Object.entries(Object.groupBy(prices.entries,entry=>entry.series)).map(([series,entries])=>[series,entries.length])),
    {
      'LINEO QUIET ES':6,'LINEO QUIET':6,LINEO:7,'CA MD EXTRA EU':7,'CA MD E RF':5,
      'SLIMROOF ES':10,'HEATMASTER F400':10,'E-ATEX':14,TIRACAMINO:1,PUNTO:9,
      'PUNTO FILO':3,'PUNTO FOUR':3,'PUNTO GHOST':3,'PUNTO EVO FLEXO':4,
      'PUNTO EVO':10,'PUNTO EVO GOLD':8,'VORTICE VARIO':2,'VORTICE VARIO I':3,
      'VORT QUADRO':3,'VORT QUADRO I':6,'VORT QUADRO EVO':23,'VORT QBK SAL-KC EVO':10
    }
  );
});

test('known PDF traps resolve to the product-table price, not a reused code or technical row',()=>{
  const byKey=new Map(priceList().entries.map(entry=>[entry.productKey,entry]));
  const expected={
    'VORTICE-RESIDENTIAL|PUNTO:11301:M 120/5':[39,7],
    'VORTICE-RESIDENTIAL|PUNTO:11401:M 150/6':[62,7],
    'VORTICE-LINEO|17180|LINEO 200':[188,18],
    'VORTICE-CA-MD|16107':[134,19],
    'VORTICE-ROOF|15271':[548,25],
    'VORTICE-EATEX-TIRACAMINO|40320':[1082,29],
    'VORTICE-QBK-SAL-KC-EVO|43151':[1616,28]
  };
  for(const [key,[listPrice,sourcePage]] of Object.entries(expected)){
    assert.equal(byKey.get(key)?.listPrice,listPrice,key);
    assert.equal(byKey.get(key)?.sourcePage,sourcePage,key);
  }
  assert.notEqual(byKey.get('VORTICE-QBK-SAL-KC-EVO|43151')?.listPrice,1675,'TORRETTE price leaked into QBK');
  assert.ok(!byKey.has('VORTICE-LINEO|17173|LINEO 160 QUIET ES'));
  assert.ok(!byKey.has('VORTICE-CA-MD|16150'));
  assert.ok(!byKey.has('VORTICE-ROOF|15260'));
  assert.ok(!byKey.has('VORTICE-QBK-SAL-KC-EVO|43152'));
});

test('catalog, selection, project source and quotation source receive the EUR list price',()=>{
  const context=applicationHarness();
  const key='VORTICE-LINEO|17180|LINEO 200';
  const catalogModel=context.window.VensisCatalog.getModel(key);
  assert.deepEqual({...catalogModel.pricing},{
    listPrice:188,
    currency:'EUR',
    catalogue:'Vensis Urun Fiyat Katalogu 2026.1',
    sourcePage:18
  });
  const selectionModels=context.window.VensisState.models.filter(model=>model.productKey===key);
  assert.ok(selectionModels.length>0);
  assert.ok(selectionModels.every(model=>model.price===188));
  assert.equal(context.window.VensisCatalog.getModel('VORTICE-LINEO|17173|LINEO 160 QUIET ES').pricing.listPrice,null);

  for(const file of ['js/catalog-project-bridge.js','js/catalog-project-picker.js','js/project-nav.js']){
    assert.match(fs.readFileSync(path.join(root,file),'utf8'),/price:Number\(model\.pricing\?\.listPrice\)\|\|0/,file);
  }
  assert.match(fs.readFileSync(path.join(root,'js','ui','results.js'),'utf8'),/price:Number\(r\.price\)\|\|0/);
  assert.match(fs.readFileSync(path.join(root,'js','quotation.js'),'utf8'),/data-quote-item-price/);
});

test('an explicit Edit Mode price overrides the imported list without changing the source list',()=>{
  const context=applicationHarness(177);
  const model=context.window.VensisCatalog.getModel('VORTICE-LINEO|17180|LINEO 200');
  assert.equal(model.pricing.listPrice,177);
  assert.equal(model.pricing.currency,'EUR');
  assert.equal(model.pricing.catalogue,undefined);
  assert.equal(priceList().entries.find(entry=>entry.productKey===model.id).listPrice,188);
});

test('missing legacy prices are hydrated once by exact product key and manual prices stay untouched',()=>{
  const context=applicationHarness();
  vm.runInContext(fs.readFileSync(path.join(root,'js/pricing.js'),'utf8'),context,{filename:'js/pricing.js'});
  const key='VORTICE-LINEO|17180|LINEO 200';
  const missing={mode:'catalog',productKey:key,price:0};
  const exactExisting={mode:'selection',productKey:key,price:188};
  const manualExisting={mode:'catalog',productKey:key,price:177};
  const unknown={mode:'catalog',productKey:'VORTICE-LINEO|does-not-exist',price:0};

  assert.equal(context.window.VensisPricing.enrichItems([missing,exactExisting,manualExisting,unknown]),true);
  assert.equal(missing.price,188);
  assert.equal(missing.priceSource,'Vensis Urun Fiyat Katalogu 2026.1');
  assert.equal(missing.priceCurrency,'EUR');
  assert.equal(exactExisting.price,188);
  assert.equal(exactExisting.priceSource,'Vensis Urun Fiyat Katalogu 2026.1');
  assert.equal(manualExisting.price,177);
  assert.equal(manualExisting.priceSource,undefined);
  assert.equal(unknown.price,0);

  missing.price=0;
  missing.priceSource='manual';
  assert.equal(context.window.VensisPricing.enrichItems([missing]),false);
  assert.equal(missing.price,0);
});

test('every product entry point loads prices before the versioned registry',()=>{
  for(const file of ['index.html','catalog.html','project.html','quotation.html','project-print.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const priceIndex=html.indexOf('data/vortice-prices-2026-1.js?v=20260814-vortice-prices');
    const registryIndex=html.indexOf('products/registry.js?v=20260814-lineo-model-image');
    assert.ok(priceIndex>=0,file);
    assert.ok(registryIndex>priceIndex,file);
  }
});

test('project and quotation hydrate prices after the registry and preserve price provenance in cloud storage',()=>{
  for(const [file,entry] of [['project.html','js/project.js?v=20260814-vortice-prices'],['quotation.html','js/quotation.js?v=20260814-vortice-prices']]){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const registryIndex=html.indexOf('products/registry.js?v=20260814-lineo-model-image');
    const pricingIndex=html.indexOf('js/pricing.js?v=20260814-vortice-prices');
    const entryIndex=html.indexOf(entry);
    assert.ok(pricingIndex>registryIndex,file);
    assert.ok(entryIndex>pricingIndex,file);
  }
  const quotationHtml=fs.readFileSync(path.join(root,'quotation.html'),'utf8');
  assert.ok(quotationHtml.indexOf('js/quotation.js?v=20260814-vortice-prices')>quotationHtml.indexOf('js/projects-store.js?v=20260813-purchase-order'));

  const api=fs.readFileSync(path.join(root,'api/projects/bootstrap.php'),'utf8');
  assert.match(api,/'priceSource' => \[180, false\]/);
  assert.match(api,/'priceCurrency' => \[12, false\]/);
});
