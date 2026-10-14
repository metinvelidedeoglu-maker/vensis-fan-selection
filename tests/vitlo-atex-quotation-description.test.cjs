const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const desktopSource=fs.readFileSync(path.resolve(__dirname,'../js/desktop-editor-toggle.js'),'utf8');
const bridgeSource=fs.readFileSync(path.resolve(__dirname,'../js/atex-output-bridge.js'),'utf8');
const quotationSource=fs.readFileSync(path.resolve(__dirname,'../js/quotation.js'),'utf8');
const printFitSource=fs.readFileSync(path.resolve(__dirname,'../js/quotation-silent-fix.js'),'utf8');

test('quotation code does not infer certification from an ATEX product name',()=>{
  const source=desktopSource+bridgeSource;
  assert.doesNotMatch(source,/Zone 1 Gas \/ Zone 21 Dust/);
  assert.doesNotMatch(source,/II 2G Ex db IIC T4 Gb/);
  assert.doesNotMatch(source,/II 2D Ex tb IIIC T125°C Db/);
  assert.doesNotMatch(desktopSource,/vitlo-atex-quotation-marking/);
});

test('quotation localizes the descriptive series title through the shared language layer',()=>{
  assert.match(quotationSource,/item\?\.seriesTitle\|\|item\?\.series/);
  assert.match(quotationSource,/VensisI18n\?\.t/);
  assert.match(quotationSource,/document\.documentElement\.lang/);
  assert.match(quotationSource,/has-line-descriptions/);
  assert.match(printFitSource,/quote-page\.has-line-descriptions/);
});

test('ATEX helper exposes only structured catalogue markings',()=>{
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(bridgeSource,context);
  const helper=context.window.VensisAtexOutput;
  assert.deepEqual([...helper.verifiedLines({manufacturer:'Vitlo',series:'AXD/ATEX',model:'AXD/ATEX 40-2T-1'})],[]);
  assert.deepEqual([...helper.verifiedLines({hazardousArea:{gas_marking:'II 2G Ex h IIB T3 Gb',dust_marking:'II 2D Ex h IIIC T125°C Db'}})],[
    'II 2G Ex h IIB T3 Gb','II 2D Ex h IIIC T125°C Db'
  ]);
  assert.equal(helper.apply(),false);
});
