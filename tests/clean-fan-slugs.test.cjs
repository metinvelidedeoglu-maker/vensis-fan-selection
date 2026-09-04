const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Apache serves clean localized fan paths through the existing catalog engine',()=>{
  const source=read('.htaccess');
  assert.match(source,/\^\(tr\|en\)\/fan\/vortice\/\?\$/);
  assert.match(source,/catalog-vortice-stable\.html/);
  assert.match(source,/\^\(tr\|en\)\/fan\/vortice\/\[\^\/\]\+/);
  assert.match(source,/catalog-vortice\.html/);
  assert.match(source,/\^\(tr\|en\)\/fan\/\(vitlo\|soler-palau\)/);
  assert.match(source,/catalog-brand\.html/);
});

test('catalog boot recognizes clean fan routes before brand and series data load',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/cleanFanMatch/);
  assert.match(gate,/VENSIS_CLEAN_FAN_ROUTE/);
  assert.match(gate,/brandSlug==='soler-palau'\?'sp':brandSlug/);
  assert.match(gate,/vorticeSeriesBySlug/);
  assert.match(gate,/catalog-clean-routes\.js\?v=20260904-r1/);
});

test('clean fan runtime builds series and model links without routing query parameters',()=>{
  const routes=read('js/catalog-clean-routes.js');
  assert.match(routes,/const parts=\[language,'fan',brand\]/);
  assert.match(routes,/parts\.push\(slugify\(series\.code\|\|series\.id\)\)/);
  assert.match(routes,/parts\.push\(slugify\(modelIdentity\(model\)\)\)/);
  assert.match(routes,/vensis-clean-series-link/);
  assert.match(routes,/vensis-clean-model-link/);
  assert.match(routes,/history\.replaceState/);
  assert.match(routes,/setCanonical\(own\)/);
  assert.match(routes,/setAlternate\('en',en\)/);
  assert.match(routes,/setAlternate\('tr',tr\)/);
  assert.match(routes,/setAlternate\('x-default',en\)/);
});

test('fan sitemap emits clean brand series and model paths',()=>{
  const sitemap=read('sitemap-fans.php');
  assert.match(sitemap,/function fan_slug/);
  assert.match(sitemap,/function fan_brand_slug/);
  assert.match(sitemap,/\/fan\/.*\$brandSlug/);
  assert.doesNotMatch(sitemap,/catalog-brand\.html\?/);
  assert.doesNotMatch(sitemap,/catalog-vortice\.html\?/);
  assert.doesNotMatch(sitemap,/http_build_query/);
});

test('locale URL layer treats clean fan paths as public and strips boot-only routing parameters',()=>{
  const locale=read('js/seo-locale-paths.js');
  assert.match(locale,/isCleanFanPath/);
  assert.match(locale,/fan\\\/\(\?:vitlo\|soler-palau\|vortice\)/);
  assert.match(locale,/url\.searchParams\.delete\('brand'\)/);
  assert.match(locale,/url\.searchParams\.delete\('series'\)/);
  assert.match(locale,/url\.searchParams\.delete\('model'\)/);
});
