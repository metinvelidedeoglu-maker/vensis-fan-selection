const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../.htaccess'),'utf8');

test('internal accessories page is excluded from search indexing',()=>{
  assert.match(source,/\(index\|fan-selection\|catalog\|projects\|project\|customers\|custom-products\|quotation\|order\|project-print\|detail\|accessories\)\\\.html/);
  assert.match(source,/X-Robots-Tag "noindex, nofollow"/);
});
