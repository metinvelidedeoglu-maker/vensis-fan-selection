const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('public catalog boot respects lang parameter before catalog SEO starts',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/languageParams\.get\('lang'\)/);
  assert.match(gate,/vensis_language_v1/);
  assert.match(gate,/history\.replaceState/);
  assert.match(gate,/seo-bilingual\.js\?v=20260902-r1/);
  assert.match(gate,/seoLanguage\.async=false/);
});

test('bilingual SEO publishes self-canonical and reciprocal hreflang links',()=>{
  const seo=read('js/seo-bilingual.js');
  assert.match(seo,/link\[rel="alternate"\]\[hreflang=/);
  assert.match(seo,/setAlternate\('en',en\)/);
  assert.match(seo,/setAlternate\('tr',tr\)/);
  assert.match(seo,/setAlternate\('x-default',en\)/);
  assert.match(seo,/canonical\.href=withLanguage\(source,lang\)/);
  assert.match(seo,/og:locale/);
});

test('Turkish and English catalog URLs remain in one product data architecture',()=>{
  const seo=read('js/seo-bilingual.js');
  assert.match(seo,/searchParams\.set\('lang'/);
  assert.match(seo,/window\.VensisCatalog/);
  assert.match(seo,/Vensis Ürün Kataloğu/);
  assert.match(seo,/Endüstriyel Havalandırma Fan Kataloğu/);
  assert.match(seo,/patchJsonLd/);
  assert.match(seo,/inLanguage/);
});

test('static sitemap exposes reciprocal Turkish and English catalog alternates',()=>{
  const sitemap=read('sitemap-static.xml');
  assert.match(sitemap,/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(sitemap,/catalog-hub\.html\?lang=en/);
  assert.match(sitemap,/catalog-hub\.html\?lang=tr/);
  assert.match(sitemap,/hreflang="en"/);
  assert.match(sitemap,/hreflang="tr"/);
});

test('fan and electrical sitemaps emit both language variants with hreflang',()=>{
  for(const file of ['sitemap-fans.php','sitemap-electrical.php']){
    const source=read(file);
    assert.match(source,/xmlns:xhtml/);
    assert.match(source,/hreflang=\\?"en\\?"/);
    assert.match(source,/hreflang=\\?"tr\\?"/);
    assert.match(source,/lang=/);
  }
});
