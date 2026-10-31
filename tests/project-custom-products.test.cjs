const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../js/project-custom-core.js');
function runtime({mode='secure',fail=false}={}){
 const nodes=new Map(),listeners={},formListeners={},requests=[];let items=[],writes=0;
 const node=id=>{const existing=[...nodes.values()].find(item=>item.id===id);if(existing)return existing;if(!nodes.has(id))nodes.set(id,{id,value:'',files:[],hidden:false,disabled:false,childNodes:[],style:{},classList:{remove(){}},setAttribute(){},appendChild(){},before(){},focus(){},closest(){return {childNodes:[]}},querySelector(){return node('sub-'+id)},querySelectorAll(){return []}});return nodes.get(id)};
 const form=node('customProductForm');form.addEventListener=(name,fn)=>formListeners[name]=fn;
 const document={documentElement:{lang:'tr'},body:{classList:{remove(){}}},getElementById:node,createElement:()=>node('generated'+nodes.size),addEventListener:(name,fn)=>listeners[name]=fn};
 const project={projectId:'prj_test',readMeta:()=>({name:'Test Project'}),readItems:()=>JSON.parse(JSON.stringify(items)),writeItems:next=>{writes++;items=next},render(){},flushAllNotes(){}};
 const context={document,URL,Image:class{},console,window:{VensisProject:project,VensisProjectCustom:core,VensisAccess:{mode:()=>mode},VensisI18n:{getLanguage:()=> 'tr'},addEventListener(){}},fetch:async(url,options={})=>{requests.push({url,...options});if(url.includes('session'))return {ok:true,json:async()=>({authenticated:true,csrf:'test-only-csrf'})};return {ok:!fail,json:async()=>fail?{ok:false,error:'Test failure'}:{ok:true,stored:true,product:JSON.parse(options.body).product}}}};
 vm.runInNewContext(fs.readFileSync('js/custom-product-editor.js','utf8'),context);
 function open(index=null){listeners.click({target:{closest:selector=>index===null?(selector==='#addCustomProduct'?{}:null):(selector==='[data-edit-product]'?{dataset:{editProduct:String(index)}}:null)}})}
 async function save(){await formListeners.submit({preventDefault(){},stopImmediatePropagation(){}});await new Promise(resolve=>setImmediate(resolve))}
 return {node,open,save,requests,get items(){return items},get writes(){return writes}};
}
test('manual entry saves project-scoped catalog record and exact basic fields into project',async()=>{
 const app=runtime();app.open();
 const fields={model:'Custom <model>',series:'Type A',manufacturer:'Brand',description:'230 V • special material',price:'150',discountPercent:'10',quantity:'2',image:'https://example.com/product.png'};
 for(const [id,value]of Object.entries(fields))app.node('custom-'+id).value=value;
 await app.save();assert.equal(app.writes,1);assert.equal(app.items.length,1);
 const record=JSON.parse(app.requests[1].body).product,line=app.items[0];
 assert.equal(record.scope,'project');assert.equal(record.projectId,'prj_test');assert.equal(record.projectName,'Test Project');
 assert.equal(line.productKey,record.id);assert.equal(core.isProjectProduct(line),true);
 for(const key of ['model','series','manufacturer','description','image'])assert.equal(line[key],fields[key]);
 assert.equal(line.price,150);assert.equal(line.discountPercent,10);assert.equal(line.quantity,2);
 app.open(0);app.node('custom-description').value='Revised';await app.save();
 assert.equal(app.items.length,1);assert.equal(app.items[0].productKey,record.id);assert.equal(app.items[0].description,'Revised');
});
test('unauthenticated entry and failed catalog writes cannot add a project line',async()=>{
 for(const options of [{mode:'guest'},{fail:true}]){
  const app=runtime(options);app.open();app.node('custom-model').value='Test';await app.save();
  assert.equal(app.writes,0);assert.equal(app.items.length,0);assert.ok(app.node('projectCustomStatus').textContent);
  if(options.mode==='guest')assert.equal(app.requests.length,0);
 }
});
test('project item round trip retains descriptions, images and stable line identity',()=>{
 const record=core.record({model:'Item',description:'Text',price:100,quantity:3,image:'https://example.com/image.png'},{id:'prj_one',name:'One'});
 const item=core.toItem(record);const revised=core.toItem({...record,description:'Edited'},item);
 assert.equal(revised.itemKey,item.itemKey);assert.equal(revised.productKey,record.id);assert.equal(revised.image,record.image);assert.equal(revised.description,'Edited');
 assert.throws(()=>core.record({model:''},{id:'p'}));
});

test('project source panel offers exactly three sources and sends catalog traffic through the hub',()=>{
 const footer={className:'',innerHTML:'',querySelector:()=>({addEventListener(){}})},listeners={};
 const document={readyState:'complete',documentElement:{lang:'tr'},getElementById:()=>({}),querySelector:selector=>selector.includes('custom-product-footer')?footer:null};
 const window={VensisProject:{projectId:'prj one'},VensisI18n:{getLanguage:()=> 'tr'},addEventListener:(name,fn)=>listeners[name]=fn};
 vm.runInNewContext(fs.readFileSync('js/project-product-sources.js','utf8'),{document,window,encodeURIComponent});
 assert.equal((footer.innerHTML.match(/class="project-product-source(?: |")/g)||[]).length,3);
 assert.match(footer.innerHTML,/\/tr\/catalog-hub\.html\?project=prj%20one/);assert.match(footer.innerHTML,/Projeye Özel Ürün/);assert.doesNotMatch(footer.innerHTML,/catalog-ventilation\.html|electrical\/index\.html|Add Custom Product/);
});
