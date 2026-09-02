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

test('fan sitemap deduplicates model URLs and supports object-literal additions',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/parse_json_push_rows/);
  assert.match(source,/parse_object_literal_rows/);
  assert.match(source,/add_fan_url/);
  assert.match(source,/ksort\(\$urls\)/);
});

test('robots advertises fan and electrical product sitemaps',()=>{
  const robots=read('robots.txt');
  assert.match(robots,/sitemap-fans\.php/);
  assert.match(robots,/sitemap-electrical\.php/);
});
