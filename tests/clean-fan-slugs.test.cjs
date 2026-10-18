const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('Apache serves existing and future manufacturer routes through one catalog',()=>{
  const source=read('.htaccess');
  const rules=source.split('\n').filter(line=>/RewriteRule.*catalog\.html \[L,QSA\]/.test(line));
  assert.equal(rules.length,1);
  const matcher=new RegExp(rules[0].trim().split(' ')[1]);
  for(const route of ['en/fan/vitlo/axf/','tr/fan/vortice/ca-md/100/','en/fan/soler-palau/','tr/fan/new-brand/series/model/'])assert.ok(matcher.test(route),route);
  assert.doesNotMatch(source,/catalog-(?:brand|vortice).*\.html/);
});
test('deep routes retain resource resolution and locale-root navigation',()=>{
  const source=read('.htaccess');
  assert.ok(source.includes('(assets|css|js|data|products|api)'));
  assert.ok(source.includes('$2/$3 [L,QSA]'));
  assert.ok(source.includes('$1/$2 [R=301,L,NE]'));
});
test('boot resolves clean routes generically before loading common data',()=>{
  const source=read('js/access-gate.js');
  assert.match(source,/VENSIS_CLEAN_FAN_ROUTE/);
  assert.match(source,/bootParams\.set\('brand',brandKey\)/);
  assert.doesNotMatch(source,/vorticeSeriesBySlug/);
  assert.match(source,/isPublicCatalog=isUnifiedCatalog/);
  assert.match(read('catalog.html'),/js\/ventilation-routes\.js/);
});
