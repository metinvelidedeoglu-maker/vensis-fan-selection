const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const U=require('../js/order-utils.js');

function workflow(){
  const projectId='prj_purchase_123456';
  let meta={name:'Hangar',reference:'Müşteri A',contact:'Ayşe Hanım',status:'quoted',orders:[]};
  const items=[{itemKey:'fan-1',mode:'selection',model:'AXW 50-4T',series:'AXW',manufacturer:'Vitlo',quantity:2,price:1200,discountPercent:10}];
  const writes=[];
  const store={
    activeId:()=>projectId,
    get:id=>id===projectId?{id,name:'Hangar',reference:'Müşteri A',contact:'Ayşe Hanım'}:null,
    readMeta:()=>structuredClone(meta),readItems:()=>structuredClone(items),
    writeMeta(patch){meta={...meta,...structuredClone(patch)};writes.push(structuredClone(patch));return structuredClone(meta)}
  };
  const context={window:{VensisProjects:store,VensisOrderUtils:U},location:{assign(){}},URLSearchParams,Date,Math,String,Array,Object};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/orders.js'),'utf8'),context);
  return {api:context.window.VensisOrders,projectId,meta:()=>meta,writes};
}

test('creating and sending an order advances the project workflow',()=>{
  const {api,projectId,meta}=workflow();
  const order=api.create(projectId,{now:new Date(2026,7,13,10,0,0)});
  assert.equal(meta().status,'won');
  assert.equal(meta().orders.length,1);
  assert.equal(Object.hasOwn(meta().orders[0].items[0],'price'),false);

  const sent=api.markSent(projectId,order.id,{supplier:'Vitlo'});
  assert.equal(sent.status,'sent');
  assert.ok(sent.sentAt);
  assert.equal(meta().status,'ordered');

  api.create(projectId,{now:new Date(2026,7,13,11,0,0)});
  assert.equal(meta().orders.length,2);
  assert.equal(meta().status,'ordered','a new draft must not downgrade an ordered project');
});

test('the same quotation reopens its existing order',()=>{
  const {api,projectId,meta}=workflow();
  const quotation={quotationNumber:'VNS-260813-100000',items:[{model:'AXW 50-4T',manufacturer:'Vitlo',quantity:1}]};
  const first=api.createOrReuse(projectId,{quotation,now:new Date(2026,7,13,10,0,0)});
  const second=api.createOrReuse(projectId,{quotation,now:new Date(2026,7,13,11,0,0)});
  assert.equal(second.id,first.id);
  assert.equal(meta().orders.length,1);
});

test('a project reopens its latest order unless a new order is requested explicitly',()=>{
  const {api,projectId,meta}=workflow();
  const first=api.createOrReuse(projectId,{now:new Date(2026,7,13,10,0,0)});
  api.markSent(projectId,first.id,{supplier:'Vitlo'});
  const reopened=api.createOrReuse(projectId,{now:new Date(2026,7,13,11,0,0)});
  assert.equal(reopened.id,first.id);
  assert.equal(meta().orders.length,1);
});

test('purchase order entry points, form fields and cloud schema are wired',()=>{
  const project=fs.readFileSync(path.join(__dirname,'../project.html'),'utf8');
  const quotation=fs.readFileSync(path.join(__dirname,'../quotation.html'),'utf8');
  const order=fs.readFileSync(path.join(__dirname,'../order.html'),'utf8');
  const backend=fs.readFileSync(path.join(__dirname,'../api/projects/bootstrap.php'),'utf8');

  assert.match(project,/id="createOrder"/);
  assert.match(quotation,/id="createOrderFromQuotation"/);
  for(const id of ['recipientType','supplier','deliveryTime','deliveryPlace','paymentTerms','orderItemChoices','markOrderSent'])assert.match(order,new RegExp(`id="${id}"`));
  assert.match(order,/SİPARİŞ FORMU/);
  assert.doesNotMatch(order,/Unit Price|List Price|Discount|İskonto|Birim Fiyat/i);
  assert.match(backend,/function project_order\(/);
  assert.match(backend,/'orders' => \$orders/);
  assert.match(backend,/'status' => \$status/);
});
