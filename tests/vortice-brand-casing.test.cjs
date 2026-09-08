const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('uppercase Vortice brand labels keep the official ASCII spelling',()=>{
  for(const file of ['js/catalog.js','js/vortice-manifest-catalog.js']){
    const source=read(file);
    assert.match(source,/toLowerCase\(\)==='vortice'\?'VORTICE'/,file);
    assert.match(source,/series-brand[^\n]+displayBrand/,file);
  }
});

test('catalog pages cache-bust the corrected brand renderers',()=>{
  assert.match(read('catalog-vortice-stable.html'),/vortice-manifest-catalog\.js\?v=20260908-vortice-casing-r1/);
  for(const file of ['catalog.html','catalog-brand.html','catalog-vortice.html']){
    assert.match(read(file),/catalog\.js\?v=20260908-vortice-casing-r1/,file);
  }
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
  for(const file of ['catalog.html','catalog-brand.html','catalog-vortice.html']){
    assert.match(read(file),/catalog-language-cleanup\.js\?v=20260908-vortice-title-r1/,file);
  }
});
