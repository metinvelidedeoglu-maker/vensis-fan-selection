const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('visible SEO layer loads catalog breadcrumbs',()=>{
  const visible=read('js/catalog-visible-seo.js');
  assert.match(visible,/catalog-breadcrumbs\.js\?v=20260902-r1/);
  assert.match(visible,/data-vensis-catalog-breadcrumbs/);
});

test('breadcrumbs cover fan, Vortice and electrical catalog hierarchy',()=>{
  const source=read('js/catalog-breadcrumbs.js');
  for(const route of ['catalog-ventilation.html','catalog-brand.html','catalog-vortice-stable.html','catalog-vortice.html','electrical/index.html']){
    assert.match(source,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  assert.match(source,/Product Catalog/);
  assert.match(source,/Ürün Kataloğu/);
  assert.match(source,/Soler & Palau/);
  assert.match(source,/Vortice/);
  assert.match(source,/VENSIS_ELECTRICAL_PRODUCTS/);
  assert.match(source,/VensisCatalog/);
});

test('breadcrumb links preserve current query context and language',()=>{
  const source=read('js/catalog-breadcrumbs.js');
  assert.match(source,/new URLSearchParams\(location\.search\)/);
  assert.match(source,/cleanParams/);
  assert.match(source,/lang/);
  assert.match(source,/series/);
  assert.match(source,/model/);
  assert.match(source,/vensis-language-changed/);
  assert.match(source,/vensis-electrical-route-changed/);
});
