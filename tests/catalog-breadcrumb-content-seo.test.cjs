const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('visible SEO loads breadcrumb and metadata enhancements',()=>{
  const source=read('js/catalog-visible-seo.js');
  assert.match(source,/catalog-breadcrumbs\.js/);
  assert.match(source,/catalog-seo-copy\.js/);
  assert.match(source,/data-vensis-breadcrumbs/);
  assert.match(source,/data-vensis-seo-copy/);
});

test('visible detail copy is generated for fan series and model routes in both languages',()=>{
  const source=read('js/catalog-visible-seo.js');
  assert.match(source,/fanDetailCopy/);
  assert.match(source,/performance curve/);
  assert.match(source,/performans eğrisi/);
  assert.match(source,/ATEX \/ Exproof/);
  assert.match(source,/exact certification markings/i);
  assert.match(source,/doğrulanmış katalog verisi/);
});

test('visible breadcrumbs preserve language and cover catalog hierarchy',()=>{
  const source=read('js/catalog-breadcrumbs.js');
  assert.match(source,/Product Catalog/);
  assert.match(source,/Ürün Kataloğu/);
  assert.match(source,/Ventilation/);
  assert.match(source,/Havalandırma/);
  assert.match(source,/Electrical/);
  assert.match(source,/Elektrik/);
  assert.match(source,/searchParams\.set\('lang',language\)/);
  assert.match(source,/searchParams\.set\('series'/);
  assert.match(source,/params\(\)\.get\('model'\)/);
  assert.match(source,/aria-current/);
});

test('metadata enhancer uses real model and series performance data',()=>{
  const source=read('js/catalog-seo-copy.js');
  assert.match(source,/nominalAirflow/);
  assert.match(source,/motor\?\.power/);
  assert.match(source,/motor\?\.speed/);
  assert.match(source,/motor\?\.current/);
  assert.match(source,/models\.length/);
  assert.match(source,/performance curves/);
  assert.match(source,/performans eğrileri/);
});

test('metadata enhancer patches ProductGroup and Product descriptions without inventing ATEX certification',()=>{
  const source=read('js/catalog-seo-copy.js');
  assert.match(source,/item\?\.\['@type'\]==='ProductGroup'/);
  assert.match(source,/product\.description=fanModelCopy/);
  assert.match(source,/verified catalog data/);
  assert.match(source,/doğrulanmış katalog verisi/);
  assert.doesNotMatch(source,/AggregateRating/);
  assert.doesNotMatch(source,/availability:/);
});
