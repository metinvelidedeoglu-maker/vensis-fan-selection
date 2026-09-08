const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('project rows show submodel code, description without series code, then brand',()=>{
  const tbody={innerHTML:''};
  const elements=new Map();
  const element=id=>{
    if(elements.has(id))return elements.get(id);
    const node={
      id,value:'',hidden:false,textContent:'',innerHTML:'',dataset:{},style:{},
      classList:{add(){},remove(){}},
      addEventListener(){},
      querySelector:selector=>id==='projectTable'&&selector==='tbody'?tbody:null
    };
    elements.set(id,node);
    return node;
  };
  const item={
    itemKey:'catalog|VORTICE-LINEO|17160|LINEO 100 QUIET',mode:'catalog',
    productKey:'VORTICE-LINEO|17160|LINEO 100 QUIET',model:'LINEO 100 QUIET',
    series:'LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',manufacturer:'Vortice',quantity:1
  };
  const model={id:item.productKey,seriesId:'LINEO QUIET',model:item.model,motor:{},technical:{}};
  const series={id:'LINEO QUIET',code:'LINEO QUIET'};
  const store={
    get:id=>id==='project-1'?{id}:null,setActive:id=>id,activeId:()=>'',list:()=>[],
    readItems:()=>[item],writeItems(){},readMeta:()=>({}),writeMeta:value=>value,
    keys:{itemsPrefix:'items-',metaPrefix:'meta-'}
  };
  const document={
    body:{classList:{add(){},remove(){}}},title:'',
    getElementById:element,querySelectorAll:()=>[],addEventListener(){}
  };
  const window={
    VensisProjects:store,
    VensisCatalog:{models:[model],series:[series],getModel:id=>id===model.id?model:null,getSeries:id=>id===series.id?series:null},
    VensisQuotationFormats:{itemType:()=> 'fan',detect:()=> 'fan'},
    addEventListener(){},dispatchEvent(){},open(){}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/project.js'),'utf8'),{
    window,document,location:{search:'?project=project-1',replace(){}},localStorage:{setItem(){}},
    URLSearchParams,Intl,Date,Number,String,Array,Math,Object,Boolean,Map,CustomEvent:class{},
    setTimeout:()=>0,clearTimeout(){},confirm:()=>true,alert(){}
  });
  assert.match(tbody.innerHTML,/<strong>LINEO 100 QUIET<\/strong><span>Low-Noise In-Line Mixed-Flow Fans<\/span><small>Vortice<\/small>/);
  assert.doesNotMatch(tbody.innerHTML,/>LINEO QUIET Low-Noise In-Line Mixed-Flow Fans<\/span>/);
});
