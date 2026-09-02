const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('public catalogs load the visible SEO copy layer',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/catalog-visible-seo\.js\?v=20260902-r1/);
  assert.match(gate,/data-vensis-visible-seo/);
});

test('visible SEO copy covers Turkish and English catalog landing pages',()=>{
  const source=read('js/catalog-visible-seo.js');
  for(const phrase of [
    'Industrial Product Catalog','Endüstriyel Ürün Kataloğu',
    'Industrial Ventilation Fan Catalog','Endüstriyel Havalandırma Fan Kataloğu',
    'Vitlo Industrial Fan Series','Vitlo Endüstriyel Fan Serileri',
    'Soler & Palau Fan Series','Soler & Palau Fan Serileri',
    'Vortice Ventilation Fan Series','Vortice Havalandırma Fan Serileri',
    'ZONEX Industrial Electrical Product Series','ZONEX Endüstriyel Elektrik Ürün Serileri'
  ])assert.match(source,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('visible copy only changes list and catalog landing surfaces',()=>{
  const source=read('js/catalog-visible-seo.js');
  assert.match(source,/!params\(\)\.get\('series'\)/);
  assert.match(source,/\.catalog-content \.catalog-head/);
  assert.match(source,/\.hero/);
  assert.match(source,/vensis-language-changed/);
  assert.match(source,/vensis-electrical-route-changed/);
});
