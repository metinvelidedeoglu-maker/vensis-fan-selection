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
    VensisCatalog:{models:[],series:[],getModel:()=>null,getSeries:()=>null},
    VensisProducts:{presentation:value=>({
      altModel:value.model,
      description:'Low-Noise In-Line Mixed-Flow Fans',
      brand:value.manufacturer
    })},
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

test('the active project table renderer uses the same central product presentation',()=>{
  const script=fs.readFileSync(path.join(__dirname,'../js/project-print-action.js'),'utf8');
  assert.match(script,/products\.presentation\?\.\(item\)/);
  assert.match(script,/presentation\.altModel/);
  assert.match(script,/presentation\.description/);
  assert.match(script,/presentation\.brand/);
});
