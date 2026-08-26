const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('quotation uses a left editor with a live document preview',()=>{
  const html=read('quotation.html');
  const editorIndex=html.indexOf('id="quotationEditor"');
  const previewIndex=html.indexOf('id="quotationContent"');
  assert.ok(editorIndex>0);
  assert.ok(previewIndex>editorIndex);
  for(const id of ['editQuotationNumber','editQuotationDate','editQuotationCurrency','editQuotationFormat','editQuotationProject','editQuotationReference','editQuotationContact','quotationItemEditors','quotationProductTables','saveQuotationEditor']){
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(html,/data-quotation-editor-tab="summary"/);
  assert.match(html,/data-quotation-editor-tab="scope"/);
  assert.match(html,/data-quotation-editor-tab="terms"/);
  assert.match(html,/@media\(max-width:1100px\)\{\.quotation-workspace\{grid-template-columns:1fr\}/);
  assert.match(html,/@media print\{[\s\S]*\.toolbar,\.quotation-editor\{display:none!important\}/);
  assert.match(html,/js\/quotation-formats\.js/);
});

test('quotation defaults use the Vensis company and warehouse wording',()=>{
  const html=read('quotation.html');
  const settings=read('js/quotation-settings.js');

  assert.match(html,/Vensis depo teslim/);
  assert.match(settings,/Vensis depo teslim/);
  assert.match(html,/Bu teklif, Vensis standart satış/);
  assert.match(settings,/Bu teklif, Vensis standart satış/);
  assert.doesNotMatch(html,/AVENS depo teslim|Vitlo standart satış/);
  assert.doesNotMatch(settings,/AVENS depo teslim|Vitlo standart satış/);
});

test('quotation editor updates price, discount, quantity and project storage',()=>{
  const script=read('js/quotation.js');
  assert.match(script,/data-quote-item-quantity/);
  assert.match(script,/data-quote-item-price/);
  assert.match(script,/data-quote-item-discount/);
  assert.match(script,/data-quote-item-description/);
  assert.match(script,/function syncProject\(quotation\)/);
  assert.match(script,/store\.writeMeta\(/);
  assert.match(script,/store\.writeItems\(/);
  assert.match(script,/renderPreview\(activeQuotation\)/);
  assert.match(script,/createOrderFromQuotation[\s\S]*saveQuotation\(\{silent:true\}\)/);
  assert.match(script,/function electricalRow\(/);
  assert.match(script,/Fan Ürünleri/);
  assert.match(script,/Elektrik Ürünleri/);
  assert.match(script,/formats\.detect\(/);
});

test('project uses the same left editor pattern and keeps the working table on the right',()=>{
  const html=read('project.html');
  const editorIndex=html.indexOf('class="project-editor"');
  const mainIndex=html.indexOf('class="project-main"');
  assert.ok(editorIndex>0);
  assert.ok(mainIndex>editorIndex);
  for(const id of ['projectName','projectReference','projectContact','projectStatus','globalDiscount','saveProjectMeta','projectTable']){
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(html,/@media\(max-width:1100px\)\{\.project-workspace\{grid-template-columns:1fr\}/);
  const script=read('js/project.js');
  assert.match(script,/contact:byId\('projectContact'\)/);
  assert.match(script,/status:patch\.status===undefined/);
  assert.match(script,/saveProjectMeta/);
  assert.match(html,/id="custom-productType"/);
  assert.match(html,/js\/quotation-formats\.js/);
});

test('electrical catalog products can be added to projects with their technical fields',()=>{
  const html=read('electrical/index.html');
  const script=read('electrical/catalog.js');
  const picker=read('js/catalog-project-picker.js');
  const backend=read('api/projects/bootstrap.php');

  assert.match(html,/\.\.\/js\/projects-store\.js/);
  assert.match(html,/\.\.\/js\/catalog-project-picker\.js/);
  assert.match(script,/data-add-electrical-project/);
  assert.match(script,/productType:'electrical'/);
  assert.match(script,/orderCode:model\.orderCode/);
  assert.match(script,/`electrical\/\$\{product\.image\}`/);
  assert.match(picker,/openItem/);
  assert.match(backend,/'productType' => \[24, false\]/);
  assert.match(backend,/'operatingTemperature' => \[120, false\]/);
});
