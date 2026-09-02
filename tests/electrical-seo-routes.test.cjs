const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('electrical catalog exposes stable series and model routes',()=>{
  const source=read('electrical/catalog.js');
  assert.match(source,/searchParams\.set\('series',seriesName\)/);
  assert.match(source,/searchParams\.set\('model',modelIdentity\)/);
  assert.match(source,/popstate/);
  assert.match(source,/vensis-electrical-route-changed/);
  assert.match(source,/data-electrical-model=/);
});

test('electrical SEO emits ProductGroup, Product and Offer data',()=>{
  const source=read('electrical/seo.js');
  assert.match(source,/'@type':'ProductGroup'/);
  assert.match(source,/'@type':'Product'/);
  assert.match(source,/'@type':'Offer'/);
  assert.match(source,/hasVariant/);
  assert.match(source,/BreadcrumbList/);
  assert.match(source,/additionalProperty/);
});

test('electrical sitemap derives routes from the product data source',()=>{
  const source=read('sitemap-electrical.php');
  assert.match(source,/electrical\/data-zonex\.js/);
  assert.match(source,/modelName/);
  assert.match(source,/orderCode/);
  assert.match(source,/rawurlencode/);
  assert.match(source,/ENT_XML1/);
});

test('robots advertises one sitemap index and the index includes electrical products',()=>{
  const robots=read('robots.txt');
  const sitemap=read('sitemap.xml');
  assert.match(robots,/Sitemap: https:\/\/select\.vensis\.com\.tr\/sitemap\.xml/);
  assert.doesNotMatch(robots,/sitemap-electrical\.php/);
  assert.match(sitemap,/<sitemapindex/);
  assert.match(sitemap,/sitemap-electrical\.php/);
});
