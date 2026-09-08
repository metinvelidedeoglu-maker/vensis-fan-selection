const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'js/accessories-page.js'),'utf8');
const html=fs.readFileSync(path.join(root,'accessories.html'),'utf8');

test('successful accessory add returns to the originating project',()=>{
  assert.match(page,/store\.writeItems\(inserted\.items,projectId\);/);
  assert.match(page,/location\.replace\(`project\.html\?project=\$\{encodeURIComponent\(projectId\)\}`\)/);
});

test('accessories page cache-busts the redirect behavior',()=>{
  assert.match(html,/js\/accessories-page\.js\?v=20260908-return-r1/);
});
