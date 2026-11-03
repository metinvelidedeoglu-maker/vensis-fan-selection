const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=file=>fs.readFileSync(path.join(root,file),'utf8');
const projectPath=id=>`project.html?project=${encodeURIComponent(id)}`;
function pickerHarness(){
  const rows=[];
  const toast={style:{},textContent:''};
  const location={pathname:'/electrical/index.html',search:'',assigned:'',assign(value){this.assigned=value}};
  const store={
    get:id=>id==='project/one'?{id}:null,
    setActive(id){this.active=id;return id},
    readItems:()=>rows.slice(),
    writeItems(items,id){assert.equal(id,'project/one');rows.splice(0,rows.length,...items)},
    readMeta:()=>({name:'Test project'}),
    projectUrl:projectPath
  };
  const window={
    VensisProjects:store,
    VensisCatalog:{
      getModel:id=>id==='fan-1'?{id:'fan-1',model:'Fan One',seriesId:'series-1',motor:{},performance:{},pricing:{}}:null,
      getSeries:()=>({title:'Series One',manufacturer:'Test'}),
      product:()=>({media:{}})
    },
    addEventListener(){}
  };
  const document={
    currentScript:{src:'https://example.com/select/js/catalog-project-picker.js'},
    addEventListener(){},
    getElementById:id=>id==='catalogProjectToast'?toast:null
  };
  vm.runInNewContext(script('js/catalog-project-picker.js'),{
    window,document,location,URL,URLSearchParams,Number,String,JSON,Array,Math,Date,
    clearTimeout(){},setTimeout(){return 1}
  });
  return {picker:window.VensisCatalogProjectPicker,location,rows,store};
}
test('ventilation catalogue adds to the chosen project, then opens that project',()=>{
  const {picker,location,rows,store}=pickerHarness();
  picker.add('fan-1',null,'project/one');
  assert.equal(rows.length,1);
  assert.equal(rows[0].productKey,'fan-1');
  assert.equal(store.active,'project/one');
  assert.equal(location.assigned,'https://example.com/select/project.html?project=project%2Fone');
});
test('electrical and custom catalogue items use the same successful return',()=>{
  for(const productType of ['electrical','fan']){
    const {picker,location,rows}=pickerHarness();
    picker.addItem({model:'Custom item',productType,quantity:2},null,'project/one');
    assert.equal(rows.length,1);
    assert.equal(rows[0].quantity,2);
    assert.equal(location.assigned,'https://example.com/select/project.html?project=project%2Fone');
  }
});
test('invalid project does not add an item or navigate',()=>{
  const {picker,location,rows}=pickerHarness();
  picker.add('fan-1',null,'missing-project');
  assert.equal(rows.length,0);
  assert.equal(location.assigned,'');
});
test('fan selection adds before navigating to the active project',()=>{
  const rows=[];
  const location={pathname:'/select/fan-selection.html',assigned:'',assign(value){this.assigned=value}};
  const store={
    create(){},get:id=>id==='project/one'?{id}:null,setActive(){},
    readItems:()=>rows.slice(),writeItems(items){rows.splice(0,rows.length,...items)},
    readMeta:()=>({name:'Fan Project'}),projectUrl:projectPath
  };
  const select={value:'project/one'};
  const toast={style:{},textContent:''};
  const document={
    currentScript:{src:'https://example.com/select/js/ui/results.js'},
    getElementById:id=>id==='projectDestinationSelect'?select:id==='projectToast'?toast:null,
    querySelector(){return null},
    addEventListener(){}
  };
  const window={
    VensisState:{results:[{model:'Fan One',productKey:'fan-1',qq:1100,pp:160}]},
    VensisUtils:{number:id=>id==='q'?1000:150},
    VensisCatalog:{product:()=>({model:'Fan One',series:{title:'Series One',manufacturer:'Test'},motor:{},media:{}})},
    VensisProjects:store,
    addEventListener(){}
  };
  vm.runInNewContext(script('js/ui/results.js'),{
    window,document,location,URL,Number,String,JSON,Array,Math,Date,
    clearTimeout(){},setTimeout(){return 1}
  });
  window.VensisResults.addToProject(0,null);
  assert.equal(rows.length,1);
  assert.equal(rows[0].mode,'selection');
  assert.equal(location.assigned,'https://example.com/select/project.html?project=project%2Fone');
});
