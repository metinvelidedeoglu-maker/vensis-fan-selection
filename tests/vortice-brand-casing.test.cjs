const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('official brand casing comes from shared data for all catalog views',()=>{
  const window={};vm.runInNewContext(read('data/ventilation-catalog.js'),{window});
  assert.ok(window.VensisVentilationData.series.some(s=>s.manufacturer==='VORTICE'));
  assert.ok(window.VensisVentilationData.series.every(s=>s.manufacturer.toLowerCase()!=='vortice'||s.manufacturer==='VORTICE'));
  assert.match(read('js/catalog.js'),/series-brand[^\n]+displayBrand/);
  assert.doesNotMatch(read('js/catalog.js'),/==='vortice'/);
});
test('legacy brand pages redirect to the common cache-busted renderer',()=>{
  assert.match(read('catalog.html'),/catalog\.js\?v=20261018-series-az/);
  for(const file of ['catalog-brand.html','catalog-vortice.html','catalog-vortice-stable.html'])assert.match(read(file),/location\.replace/);
});

test('Vortice detail headings remove the series code after translation',()=>{
  const cleanup=read('js/catalog-language-cleanup.js');
  const brand={textContent:'VORTICE',dataset:{}};
  const code={textContent:'LINEO QUIET',dataset:{}};
  const title={textContent:'LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',dataset:{}};
  const hero={querySelector:selector=>({'.series-brand':brand,h1:code,h2:title}[selector]||null)};
  const querySelectorAll=selector=>{
    if(selector==='.series-title,.series-hero-copy h2')return [title];
    if(selector==='.series-hero-copy')return [hero];
    return [];
  };
  class MutationObserverStub{observe(){} disconnect(){}}
  vm.runInNewContext(cleanup,{
    window:{VensisI18n:{getLanguage:()=> 'tr'},addEventListener(){}},
    document:{readyState:'complete',documentElement:{},querySelectorAll},
    MutationObserver:MutationObserverStub,
    requestAnimationFrame:callback=>callback()
  });
  assert.equal(title.textContent,'Düşük Sesli Kanal Tipi Karışık Akışlı Fanlar');
  assert.match(read('catalog.html'),/catalog-language-cleanup\.js\?v=20261018-unified-r1/);
});
