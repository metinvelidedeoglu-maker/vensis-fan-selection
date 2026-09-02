const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('fan sitemap reads all active fan catalog data families',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/data\/fans-\*\.js/);
  assert.match(source,/data\/soler-palau-catalog\*\.js/);
  assert.match(source,/data\/sp-roof\*\.js/);
});

test('fan sitemap maps Vitlo, Soler & Palau and Vortice to public catalog routes',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/brand' => 'vitlo'/);
  assert.match(source,/brand' => 'sp'/);
  assert.match(source,/catalog-vortice\.html/);
  assert.match(source,/catalog-brand\.html/);
  assert.match(source,/PHP_QUERY_RFC3986/);
});

test('fan sitemap deduplicates model URLs and supports spread-base product additions',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/parse_json_push_rows/);
  assert.match(source,/parse_object_literal_rows/);
  assert.match(source,/Newer CR additions use a shared/);
  assert.match(source,/baseBrand/);
  assert.match(source,/add_fan_url/);
  assert.match(source,/ksort\(\$urls\)/);
});

test('new CR source files and matrix-only series are discoverable',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/add_cr_matrix_series_routes/);
  assert.match(source,/cr-family-matrix\.js/);
  for(const series of ['CRS','CRS/ATEX','CRK','CRK/ATEX','CRD','CRD/ATEX','CRH','CRH/ATEX']){
    assert.match(source,new RegExp(series.replace('/','\\/')));
  }
  const fans16=read('data/fans-16.js');
  const fans17=read('data/fans-17.js');
  assert.match(fans16,/const base=/);
  assert.match(fans17,/const base=/);
  assert.match(fans17,/CRS\/ATEX 63-2T-40/);
});

test('fan sitemap exposes reciprocal EN/TR plus x-default language signals',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/fan_lang_url\(\$loc, 'en'\)/);
  assert.match(source,/fan_lang_url\(\$loc, 'tr'\)/);
  assert.match(source,/hreflang="en"/);
  assert.match(source,/hreflang="tr"/);
  assert.match(source,/hreflang="x-default"/);
});

test('Vortice sitemap routes come only from priced products',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/vortice-prices-2026-1\.js/);
  assert.match(source,/VensisVorticePriceList2026_1/);
  assert.match(source,/strtolower\(\$brand\) === 'vortice'/);
  assert.match(source,/\['listPrice'\].*<= 0|\['listPrice'\].*> 0/s);
  assert.match(source,/productCode/);
  assert.match(source,/add_priced_vortice_routes/);
});

test('Vortice price list contains the expected active priced subset',()=>{
  const source=read('data/vortice-prices-2026-1.js');
  assert.match(source,/"totalVorticeProducts": 310/);
  assert.match(source,/"matchedProducts": 153/);
  assert.match(source,/"unpricedProducts": 157/);
});

test('main sitemap index includes the fan product sitemap',()=>{
  const sitemap=read('sitemap.xml');
  assert.match(sitemap,/<sitemapindex/);
  assert.match(sitemap,/sitemap-fans\.php/);
});
