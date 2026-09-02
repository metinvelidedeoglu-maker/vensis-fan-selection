const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('fan catalog loads crawlable model SEO links',()=>{
  const overrides=read('data/series-overrides.js');
  assert.match(overrides,/catalog-model-seo-links\.js\?v=20260902-r1/);
});

test('model headings link to self-canonical model routes with language preserved',()=>{
  const source=read('js/catalog-model-seo-links.js');
  assert.match(source,/technical\?\.productCode\|\|model\?\.model\|\|model\?\.id/);
  assert.match(source,/url\.searchParams\.set\('model',identity\)/);
  assert.match(source,/url\.searchParams\.set\('lang',currentLang\(\)\)/);
  assert.match(source,/model-card-head h3/);
  assert.match(source,/vensis-model-page-link/);
});

test('bilingual SEO keeps reciprocal language canonicals and alternates',()=>{
  const source=read('js/seo-bilingual.js');
  assert.match(source,/setAlternate\('en',en\)/);
  assert.match(source,/setAlternate\('tr',tr\)/);
  assert.match(source,/setAlternate\('x-default',en\)/);
  assert.match(source,/canonical\.href=withLanguage\(source,lang\)/);
});
