const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('accessories without images keep an empty fixed image box',()=>{
  const suite=read('js/accessory-suite.js');
  assert.doesNotMatch(suite,/vensis-accessory-arrow/);
  assert.doesNotMatch(suite,/↳/);
  assert.match(suite,/\.vensis-accessory-project \.vensis-accessory-image-slot\{[^}]*width:52px;[^}]*height:52px/);
  assert.match(suite,/\.vensis-accessory-quote \.vensis-accessory-image-slot\{[^}]*width:38px;[^}]*height:38px/);
  assert.match(suite,/\.vensis-accessory-print \.vensis-accessory-image-slot\{[^}]*width:32px;[^}]*height:32px/);
  assert.match(suite,/function accessoryImageSlot\(item\)/);
  assert.match(suite,/image\?'':` aria-hidden="true"`/);
  assert.match(suite,/onerror="this\.remove\(\)"/);
  assert.equal((suite.match(/\$\{accessoryImageSlot\(item\)\}/g)||[]).length,3);
});

test('every product row reserves its image column even when the image is missing',()=>{
  const project=read('js/project.js');
  const editor=read('js/project-print-action.js');
  const quotation=read('js/quotation.js');
  const projectPrint=read('js/project-print.js');
  const projectPrintLayout=read('js/project-print-layout.js');
  assert.match(project,/const image=`<i class="product-image-slot"/);
  assert.match(editor,/const image=`<i class="project-cell-image-slot"/);
  assert.match(quotation,/const image=`<i class="product-image-slot"/);
  assert.match(projectPrint,/class="project-product-image-slot"/);
  assert.match(projectPrintLayout,/class="project-product-image-slot"/);
  assert.doesNotMatch(projectPrint,/No product image/);
  assert.match(read('project.html'),/\.product-image-slot\{[^}]*width:64px;[^}]*height:64px/);
  assert.match(read('quotation.html'),/\.product-image-slot\{[^}]*width:38px;[^}]*height:38px/);
  assert.match(read('project-print.html'),/\.project-product-image-slot\{[^}]*width:32px;[^}]*height:32px/);
});

test('the accessory display cache is refreshed on every related screen',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/accessory-suite\.js\?v=20260908-empty-image-box-r1/);
  for(const file of ['project.html','quotation.html','project-print.html']){
    assert.match(read(file),/access-gate\.js\?v=20260908-empty-image-box-r1/,file);
  }
  assert.match(read('project.html'),/project\.js\?v=20260908-empty-image-box-r1/);
  assert.match(read('project.html'),/project-print-action\.js\?v=20260908-empty-image-box-r1/);
  assert.match(read('quotation.html'),/quotation\.js\?v=20260908-empty-image-box-r1/);
  assert.match(read('project-print.html'),/project-print\.js\?v=20260908-empty-image-box-r1/);
  assert.match(read('project-print.html'),/project-print-layout\.js\?v=20260908-empty-image-box-r1/);
});
