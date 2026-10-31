const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../js/accessory-core.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('legacy descriptions resolve only an unambiguous accessory model and preserve user text and blanks',()=>{
  const catalog={items:[{model:'Sensor',specs:'230 V • IP20'},{model:'Duplicate',specs:'A'},{model:'Duplicate',specs:'B'}]};
  const items=[
    {productType:'accessory',model:'Sensor'},
    {productType:'accessory',model:'Sensor',description:'Customer-specific requirement'},
    {productType:'accessory',model:'Sensor',description:''},
    {productType:'accessory',model:'Duplicate'},
    {productType:'accessory',model:'Removed product'},
    {productType:'fan',model:'Sensor'}
  ];
  assert.equal(core.fillAccessoryDescriptions(items,catalog),true);
  assert.equal(items[0].description,'230 V • IP20');
  assert.equal(items[1].description,'Customer-specific requirement');
  assert.equal(items[2].description,'');
  for(const item of items.slice(3))assert.equal(Object.hasOwn(item,'description'),false);
  assert.equal(core.fillAccessoryDescriptions(items,catalog),false,'opening again must not overwrite descriptions');
  assert.equal(core.buildAccessoryItem({model:'Sensor',specs:'230 V',description:''},'fan').description,'');
});

function runtime(){
  const storage=new Map(),nodes=new Map(),fields=new Map(),listeners={};
  const decode=s=>s.replace(/&(?:amp|lt|gt|quot|#039);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#039;':"'"}[x]));
  const node=id=>{
    if(nodes.has(id))return nodes.get(id);
    const element={value:'',textContent:'',hidden:false,className:'',dataset:{},events:{},classList:{add(){},toggle(){}},setAttribute(){},addEventListener(name,fn){this.events[name]=fn}};
    let markup='';
    Object.defineProperty(element,'innerHTML',{get:()=>markup,set(value){
      markup=value;
      if(id!=='quotationItemEditors')return;
      fields.clear();
      for(const match of value.matchAll(/<input\b([^>]+)>/g)){
        const key=match[1].match(/data-quote-item-(quantity|price|discount)="(\d+)"/),val=match[1].match(/\bvalue="([^"]*)"/);
        if(key)fields.set(`[data-quote-item-${key[1]}="${key[2]}"]`,{value:decode(val?.[1]||'')});
      }
      for(const match of value.matchAll(/<textarea\b[^>]*data-quote-item-description="(\d+)"[^>]*>([\s\S]*?)<\/textarea>/g))fields.set(`[data-quote-item-description="${match[1]}"]`,{value:decode(match[2])});
    }});
    nodes.set(id,element);return element;
  };
  const document={documentElement:{lang:'tr'},body:{dataset:{},classList:{add(){}}},getElementById:node,
    querySelector:selector=>fields.get(selector)||(selector.startsWith('link[')?{}:node(selector)),querySelectorAll:()=>[],addEventListener(){}};
  const context=vm.createContext({document,location:{pathname:'/quotation.html',search:'',href:'https://vensis.test/quotation.html'},
    console,Intl,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
    VensisAccess:{mode:()=> 'guest',storageKey:key=>key.replace(/^vensis_/,'vensis_guest_')},
    addEventListener:(type,fn)=>{listeners[type]=fn},dispatchEvent(){},print(){},history:{replaceState(){}}
  });
  context.window=context;
  for(const file of ['js/accessory-core.js','data/accessories-catalog.js','js/projects-store.js'])vm.runInContext(read(file),context,{filename:file});
  return {context,storage,node,fields,listeners};
}

test('accessory summaries survive quotation editing, saving, reopening and beforeprint with project sync',()=>{
  const {context:c,storage,node,fields,listeners}=runtime();
  const store=c.VensisProjects,project=store.create({name:'Accessory description regression'});
  const sensor=c.VensisAccessoriesCatalog.items.find(x=>x.id==='c-hcs');
  const fan={itemKey:'fan',productType:'fan',model:'Fan',price:500,quantity:1,description:'Fan-specific note'};
  const fresh=c.VensisAccessoryCore.buildAccessoryItem(sensor,'fan',{itemKey:'fresh'});
  const legacy={itemKey:'legacy',productType:'accessory',parentItemKey:'fan',model:sensor.model,price:92,quantity:1,code:'old-code'};
  const custom={...legacy,itemKey:'custom',description:'Site <A> & customer specification'};
  const blank={...legacy,itemKey:'blank',description:''};
  store.writeItems([fan,fresh,legacy,custom,blank],project.id);
  const stored=store.readItems(project.id);
  assert.equal(stored[1].description,sensor.specs);
  assert.equal(stored[3].description,custom.description);
  assert.equal(Object.hasOwn(stored[2],'code'),false);
  const key=c.VensisAccess.storageKey('vensis_active_quotation_v1');
  storage.set(key,JSON.stringify({quotationNumber:'QA-DESCRIPTION',project:{id:project.id,name:project.name},currency:'EUR',items:stored}));
  vm.runInContext(read('js/quotation.js'),c,{filename:'js/quotation.js'});
  assert.equal(fields.get('[data-quote-item-description="1"]').value,sensor.specs);
  assert.equal(fields.get('[data-quote-item-description="2"]').value,sensor.specs,'old project rows resolve on quotation opening');
  assert.equal(fields.get('[data-quote-item-description="3"]').value,custom.description);
  assert.equal(fields.get('[data-quote-item-description="4"]').value,'');
  assert.match(node('quotationProductTables').innerHTML,/Site &lt;A&gt; &amp; customer specification/);
  fields.get('[data-quote-item-description="1"]').value='Edited <technical> & project note';
  fields.get('[data-quote-item-description="2"]').value='';
  c.VensisQuotationEditor.save({silent:true});
  assert.equal(store.readItems(project.id)[1].description,'Edited <technical> & project note');
  assert.equal(store.readItems(project.id)[2].description,'');
  vm.runInContext(read('js/quotation.js'),c,{filename:'js/quotation.js'});
  assert.equal(fields.get('[data-quote-item-description="1"]').value,'Edited <technical> & project note');
  assert.equal(fields.get('[data-quote-item-description="2"]').value,'','a deliberate blank must survive reopening');
  fields.get('[data-quote-item-description="1"]').value='Print-time note';
  listeners.beforeprint();
  assert.equal(JSON.parse(storage.get(key)).items[1].description,'Print-time note');
  assert.equal(store.readItems(project.id)[1].description,'Print-time note');
  assert.equal(store.readItems(project.id)[0].description,'Fan-specific note');
  assert.equal(JSON.parse(storage.get(key)).items.length,5);
});

test('quotation technical-column refresh preserves prices in merged accessory rows',()=>{
  const row={classList:{contains:name=>name==='vensis-accessory-quote-row'},children:[
    {textContent:'Accessory with technical description'},
    {textContent:'€92,00'},
    {textContent:'1'},
    {textContent:'€92,00'}
  ]};
  const table={closest:()=>null,querySelectorAll:selector=>selector==='tbody tr'?[row]:[]};
  const root={querySelectorAll:()=>[table]};
  const document={documentElement:{lang:'tr'},body:{dataset:{quotationFormat:'fan'}},
    getElementById:id=>id==='quotationProductTables'?root:null,addEventListener(){}};
  const window={VensisProjects:{activeId:()=>''},VensisOrders:{},VensisOrderUtils:{},addEventListener(){}};
  const localStorage={getItem:()=>JSON.stringify({items:[{productType:'accessory',model:'Sensor',price:92,quantity:1}]})};
  vm.runInNewContext(read('js/order-flow.js'),{window,document,localStorage,Intl,MutationObserver:class{observe(){}}});
  assert.deepEqual(row.children.map(cell=>cell.textContent),['Accessory with technical description','€92,00','1','€92,00']);
});

test('project-specific products keep their basic fields and commercial totals through quotation saves',()=>{
  const {context:c,storage,node,fields}=runtime();
  const project=c.VensisProjects.create({name:'Custom product quotation regression'});
  const core=require('../js/project-custom-core.js');
  const source=core.record({model:'Special <model>',series:'Special type',manufacturer:'Custom brand',description:'Material A • 230 V',image:'https://example.com/custom.png',price:150,discountPercent:10,quantity:2},{id:project.id,name:project.name});
  const item=core.toItem(source);c.VensisProjects.writeItems([item],project.id);
  const key=c.VensisAccess.storageKey('vensis_active_quotation_v1');
  storage.set(key,JSON.stringify({quotationNumber:'QA-CUSTOM',project:{id:project.id,name:project.name},customer:{name:'QA'},currency:'EUR',items:[item]}));
  vm.runInContext(read('js/quotation.js'),c,{filename:'js/quotation.js'});
  const html=node('quotationProductTables').innerHTML;
  assert.match(html,/colspan="5"/);assert.match(html,/Special &lt;model&gt;/);assert.match(html,/Custom brand/);assert.match(html,/Material A/);assert.match(html,/135,00/);assert.match(html,/270,00/);
  fields.get('[data-quote-item-description="0"]').value='Project revision';c.VensisQuotationEditor.save({silent:true});
  const saved=c.VensisProjects.readItems(project.id)[0];assert.equal(saved.description,'Project revision');assert.equal(saved.image,item.image);assert.equal(saved.price,150);assert.equal(saved.quantity,2);assert.equal(saved.productKey,source.id);
});
