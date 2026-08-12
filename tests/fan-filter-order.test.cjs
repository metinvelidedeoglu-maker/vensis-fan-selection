const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('fan filters are ordered as category, brand and model',()=>{
  const category=html.indexOf('<summary>Category ');
  const brand=html.indexOf('<summary>Brand ');
  const model=html.indexOf('<summary>Model ');
  assert.ok(category>=0);
  assert.ok(brand>category);
  assert.ok(model>brand);
  assert.match(html,/placeholder="Search model or product code\.\.\."/);
});
