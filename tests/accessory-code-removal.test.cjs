const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('accessory catalog and UI do not retain or display catalog codes',()=>{
  const catalog=read('data/accessories-catalog.js');
  const page=read('js/accessories-page.js');
  const suite=read('js/accessory-suite.js');
  const html=read('accessories.html');
  assert.doesNotMatch(catalog,/\bcode\s*:/);
  assert.doesNotMatch(catalog,/id:'\d+-/);
  assert.doesNotMatch(page,/item\.code/);
  assert.doesNotMatch(suite,/Kod:/);
  assert.doesNotMatch(suite,/item\.orderCode/);
  assert.doesNotMatch(html,/Kod, model/);
});

test('project storage purges accessory codes and product notes from old and new records',()=>{
  const store=read('js/projects-store.js');
  assert.match(store,/function purgeAccessoryStoredFields\(items\)/);
  for(const field of ['code','orderCode','productCode','accessoryId','description'])assert.match(store,new RegExp(`'${field}'`));
  assert.match(store,/if\(purgeAccessoryStoredFields\(value\)\)\{writeJson\(itemsKey\(projectId\),value\);scheduleSave\(projectId\)\}/);
  assert.match(store,/purgeAccessoryStoredFields\(value\);/);
});
