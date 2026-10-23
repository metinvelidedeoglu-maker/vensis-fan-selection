const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function settings(){
 const storage=new Map(),document={documentElement:{lang:'tr'},getElementById:()=>null,querySelector:()=>null,addEventListener(){}},window={addEventListener(){},dispatchEvent(){}};
 const context={window,document,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},CustomEvent:class{},console};
 vm.runInNewContext(read('js/quotation-settings.js'),context);
 return window.VensisQuotationSettings;
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('quotation defaults round-trip across both languages and all formats including warranty',()=>{
 const api=settings();
 for(const format of ['fan','electrical','mixed']){
  const tr=api.defaultsFor(format,'tr'),en=api.localize(tr,'en');
  assert.deepEqual(plain(en),plain(api.defaultsFor(format,'en')));
  assert.deepEqual(plain(api.localize(en,'tr')),plain(tr));
  assert.equal(en.terms.standard.filter(t=>/warranty/.test(t)).length,1);
 }
});
test('custom terms, edited default lists, deliberate blanks and old delivery values survive translation',()=>{
 const api=settings(),value=api.read('tr');
 Object.assign(value.summary,{payment:'30% advance, 70% before dispatch',validity:'21 days',deliveryTime:'8 weeks',deliveryPlace:'Ex Vensis warehouse',quotationNote:'Özel müşteri notu 73'});
 value.scope.exclusions.push('CUSTOM EXCLUSION');value.terms.acceptance='';
 api.write(value);
 const en=api.forFormat('fan','en');
 for(const key of ['payment','validity','deliveryTime','deliveryPlace','quotationNote'])assert.equal(en.summary[key],value.summary[key],key);
 assert.equal(en.terms.acceptance,'');
 assert.equal(en.scope.exclusions.at(-1),'CUSTOM EXCLUSION');
 assert.match(en.scope.exclusions[0],/On-site/);
 assert.deepEqual(plain(api.localize(api.localize(en,'tr'),'en')),plain(en));
 const explicit=api.read();explicit.summary.deliveryTime='';explicit.summary.deliveryPlace='';api.write(explicit);
 assert.equal(api.forFormat('fan','en').summary.deliveryTime,'');
 assert.equal(api.forFormat('mixed','en').summary.deliveryPlace,'');
});
test('changing quotation format adapts built-in scope while retaining custom commercial values',()=>{
 const api=settings(),value=api.defaultsFor('fan','en');
 value.summary.payment='30% advance';value.summary.deliveryTime='';value.terms.acceptance='CUSTOM ACCEPTANCE';
 const mixed=api.applyFormat(value,'fan','mixed','en');
 assert.equal(mixed.scope.included,api.defaultsFor('mixed','en').scope.included);
 assert.equal(mixed.summary.payment,'30% advance');assert.equal(mixed.summary.deliveryTime,'');
 assert.equal(mixed.terms.acceptance,'CUSTOM ACCEPTANCE');
 const fan=api.applyFormat(mixed,'mixed','fan','en');
 assert.deepEqual(plain(fan),plain(value));
});
test('all manufacturer product text can be displayed in English without mutating raw technical data',()=>{
 const window={},document={documentElement:{lang:'en'}},context={window,document};
 vm.runInNewContext(read('data/ventilation-catalog.js'),context);
 const before=JSON.stringify(window.VensisVentilationData);
 vm.runInNewContext(read('products/ventilation-language.js'),context);
 const api=window.VensisProductLanguage,d=window.VensisVentilationData;
 for(const source of [...d.series,...d.models]){
  for(const value of [source.title,source.technical?.phase,source.technical?.safetyWarning,...Object.values(source.description||{}).flat()].filter(Boolean)){
   const en=api.text(value,'en');
   assert.doesNotMatch(en,/[çğıöşüÇĞİÖŞÜ]|\b(?:Monofaze|Trifaze)\b/,source.id+': '+en);
  }
  if(source.technical?.safetyWarning){
   const original=source.technical.safetyWarning,en=api.text(original,'en');
   for(const token of original.match(/\b(?:F\d{3}(?:-\d+)?|IP\d+|IIC|IIB|T[34]|Gb|RMT)\b/g)||[])assert.ok(en.includes(token),source.id+' '+token);
  }
 }
 assert.equal(JSON.stringify(d),before);
 assert.equal(api.text('Unknown custom note 21 days','en'),'Unknown custom note 21 days');
});
