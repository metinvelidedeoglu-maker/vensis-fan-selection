const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const window={};vm.runInNewContext(read('data/ventilation-catalog.js'),{window});
const data=window.VensisVentilationData;
test('sitemap consumes the same canonical records as all application pages',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/data\/ventilation-catalog\.js/);
  assert.doesNotMatch(source,/fans-\*|workbook|vortice-prices|soler-palau-catalog/);
  assert.ok(source.includes("foreach ($catalog['series'] as $series)"));
  assert.ok(source.includes("foreach ($catalog['models'] as $model)"));
});
test('sitemap routes discover every catalog manufacturer without a brand-specific branch',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/foreach \(\$catalogBrands as \$entry\)/);
  assert.doesNotMatch(source,/vortice|vitlo|soler-palau/i);
  assert.deepEqual(Array.from(data.brands,b=>b.slug).sort(),['seat','soler-palau','vitlo','vortice']);
});
test('sitemap deduplicates and sorts stable routes',()=>{
  const source=read('sitemap-fans.php');assert.match(source,/isset\(\$urls\[\$loc\]\)/);assert.match(source,/ksort\(\$urls\)/);
});
test('migrated CR and ATEX families remain discoverable',()=>{
  for(const code of ['CRS','CRS/ATEX','CRK','CRK/ATEX','CRD','CRD/ATEX','CRH','CRH/ATEX'])assert.ok(data.series.some(s=>s.code===code),code);
  assert.ok(data.models.some(m=>m.model==='CRS/ATEX 63-2T-40'));
});
test('existing Vortice active subset retains its prices',()=>{
  const ids=new Set(data.series.filter(s=>s.manufacturer==='VORTICE').map(s=>s.id));
  const rows=data.models.filter(m=>ids.has(m.seriesId));assert.equal(rows.length,156);
  assert.equal(rows.filter(m=>m.pricing.listPrice>0).length,155);
  assert.equal(rows.find(m=>m.id==='VORTICE-CMS-ATEX|30172').pricing.listPrice,null);
});
test('sitemap emits localized URLs and reciprocal language links',()=>{
  const source=read('sitemap-fans.php');for(const lang of ['en','tr','x-default'])assert.ok(source.includes('hreflang="'+lang+'"'));
  assert.match(read('sitemap.xml'),/sitemap-fans\.php/);
});
