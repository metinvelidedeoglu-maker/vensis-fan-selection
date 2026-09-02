const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('fan rich product URLs prefer product code and fall back to model name',()=>{
  const source=read('js/catalog-seo.js');
  assert.match(source,/model\?\.technical\?\.productCode\|\|model\?\.model\|\|model\?\.id/);
  assert.match(source,/url\.searchParams\.set\('model',identity\)/);
});

test('selected fan model gets its own canonical page URL',()=>{
  const source=read('js/catalog-seo.js');
  assert.match(source,/const selected=requestedModel\(variants\)/);
  assert.match(source,/const pageUrl=selected\?variantUrl\(groupUrl,selected\):groupUrl/);
  assert.match(source,/setPage\(\{title:pageTitle,description,url:pageUrl/);
  assert.match(source,/if\(selected\)crumbs\.push/);
});

test('fan ProductGroup keeps variant Product URLs linked to the series',()=>{
  const source=read('js/catalog-seo.js');
  assert.match(source,/'@type':'ProductGroup'/);
  assert.match(source,/hasVariant=variants\.map/);
  assert.match(source,/isVariantOf:\{'@id':groupUrl\+'#product-group'\}/);
  assert.match(source,/BreadcrumbList/);
});

test('fan sitemap uses the same product-code-first model identity',()=>{
  const source=read('sitemap-fans.php');
  assert.match(source,/\$productCode = trim/);
  assert.match(source,/\$model = \$productCode !== '' \? \$productCode : \$modelName/);
  assert.match(source,/productCode' => stripcslashes/);
});
