const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/custom-catalog-hub.js','utf8');
function setup(mode='secure',response={ok:true,status:200,json:async()=>({ok:true,products:[{model:'MODEL <X>',manufacturer:'Brand',productType:'electrical',description:'<script>alert(1)</script>',image:'javascript:alert(1)',price:25}]})}){
  const elements=new Map(),events={},callbacks={};let fetches=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',setAttribute(){},addEventListener(name,fn){callbacks[id+':'+name]=fn}});return elements.get(id)};
  const context={MutationObserver:class{observe(){}},document:{readyState:'complete',body:{},documentElement:{lang:'tr'},getElementById:element,querySelectorAll:()=>[]},window:{VensisAccess:{mode:()=>mode},addEventListener:(name,fn)=>events[name]=fn},location:{pathname:'/tr/catalog-hub.html',href:'https://select.vensis.com.tr/tr/catalog-hub.html'},URL,Intl,fetch:async()=>{fetches++;return response}};
  vm.runInNewContext(source,context);
  return {element,events,callbacks,get fetches(){return fetches}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('shared catalog uses current protected records and escapes product content',async()=>{
  const app=setup();await settle();
  assert.equal(app.fetches,1);
  assert.match(app.element('customCatalogStatus').textContent,/1 \/ 1/);
  const html=app.element('customCatalogProducts').innerHTML;
  assert.match(html,/MODEL &lt;X&gt;/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/src="javascript:/);assert.match(html,/25,00/);
  app.element('customCatalogSearch').value='missing';app.callbacks['customCatalogSearch:input']();
  assert.equal(app.element('customCatalogProducts').innerHTML,'');
});
test('guest catalog never requests shared records and logout clears loaded cards',async()=>{
  const guest=setup('guest');await settle();assert.equal(guest.fetches,0);assert.match(guest.element('customCatalogStatus').textContent,/oturum/);
  const app=setup();await settle();app.events['vensis-edit-session-changed']({detail:{authenticated:false}});
  assert.equal(app.element('customCatalogProducts').innerHTML,'');
});
test('expired session and server errors show distinct states without stale products',async()=>{
  const expired=setup('secure',{status:401,ok:false});await settle();assert.match(expired.element('customCatalogStatus').textContent,/oturum/);assert.equal(expired.element('customCatalogProducts').innerHTML,'');
  const failed=setup('secure',{status:500,ok:false});await settle();assert.match(failed.element('customCatalogStatus').textContent,/yüklenemedi/);
});

test('project-specific catalog records show their origin and cannot be selected for another project',async()=>{
 const app=setup('secure',{ok:true,status:200,json:async()=>({ok:true,products:[{id:'cpp_test',scope:'project',projectId:'prj_one',projectName:'Project <one>',productType:'fan',model:'Special',description:'Details',price:10}]})});
 await settle();const html=app.element('customCatalogProducts').innerHTML;
 assert.match(html,/Project &lt;one&gt;/);assert.match(html,/project\.html\?project=prj_one/);assert.match(html,/data-custom-delete="cpp_test"/);assert.doesNotMatch(html,/data-custom-add=/);
});
