const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../fan-selection.html'),'utf8');

test('fan filters are ordered as category, brand and model',()=>{
  const category=html.indexOf('<summary>Category ');
  const brand=html.indexOf('<summary>Brand ');
  const model=html.indexOf('<summary>Model ');
  assert.ok(category>=0);
  assert.ok(brand>category);
  assert.ok(model>brand);
  assert.match(html,/placeholder="Search model or product code\.\.\."/);
  assert.match(html,/class="filter-accordion filter-category"/);
  assert.match(html,/class="filter-accordion filter-brand"/);
  assert.match(html,/class="filter-accordion filter-model"/);
  assert.match(html,/css\/app\.css\?v=20260812-responsive-tolerance/);
});

test('desktop layout stacks brand and model in the right column',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');
  assert.match(css,/@media\(min-width:1001px\)\{\.duty-section\{align-self:stretch\}\.product-filter-grid\{grid-template-areas:"category brand" "category model"\}/);
  assert.match(css,/\.filter-category\{grid-area:category\}/);
  assert.match(css,/\.filter-brand\{grid-area:brand\}/);
  assert.match(css,/\.filter-model\{grid-area:model\}/);
});
