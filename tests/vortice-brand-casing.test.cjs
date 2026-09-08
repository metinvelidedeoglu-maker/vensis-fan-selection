const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('uppercase Vortice brand labels keep the official ASCII spelling',()=>{
  for(const file of ['js/catalog.js','js/vortice-manifest-catalog.js']){
    const source=read(file);
    assert.match(source,/toLowerCase\(\)==='vortice'\?'VORTICE'/,file);
    assert.match(source,/series-brand[^\n]+displayBrand/,file);
  }
});

test('catalog pages cache-bust the corrected brand renderers',()=>{
  assert.match(read('catalog-vortice-stable.html'),/vortice-manifest-catalog\.js\?v=20260908-vortice-casing-r1/);
  for(const file of ['catalog.html','catalog-brand.html','catalog-vortice.html']){
    assert.match(read(file),/catalog\.js\?v=20260908-vortice-casing-r1/,file);
  }
});
