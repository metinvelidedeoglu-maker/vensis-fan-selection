const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const listUtils=require('../js/projects-list-utils.js');

function dashboard(){
  const ids=['projectCount','totalUnits','combinedValue','projectsToolbar','projectsEmpty','projectsNoResults','projectsGrid','filterSummary','projectSearch','projectMonth','clearProjectFilters','newProject','emptyNewProject','cancelProject','projectModal','projectForm','newProjectName','newProjectReference','newProjectContact','newProjectPhone','newProjectEmail','projectCustomerOptions','projectCustomerMatch','projectFormError'];
  const elements=Object.fromEntries(ids.map(id=>[id,{
    id,value:'',hidden:false,textContent:'',innerHTML:'',style:{},listeners:{},
    classList:{values:new Set(),add(...values){values.forEach(value=>this.values.add(value))},remove(...values){values.forEach(value=>this.values.delete(value))},contains(value){return this.values.has(value)}},
    addEventListener(type,listener){this.listeners[type]=listener},focus(){this.focused=true},reset(){}
  }]));
  const projects=[
    {id:'prj_old_abc123',name:'Eski Proje',reference:'ASELSAN',createdAt:'2026-06-02T09:00:00Z',updatedAt:'2026-08-12T08:00:00Z'},
    {id:'prj_new_def456',name:'Hangar Projesi',reference:'TUSAŞ',createdAt:'2026-08-11T14:00:00Z',updatedAt:'2026-08-11T14:00:00Z'},
    {id:'prj_mid_ghi789',name:'Aydınlatma',reference:'Roketsan',createdAt:'2026-07-22T08:30:00Z',updatedAt:'2026-07-22T08:30:00Z'}
  ];
  const state={projectInput:null,customerInput:null,assigned:''};
  const store={
    list:()=>projects,
    readMeta:id=>projects.find(project=>project.id===id)||{},
    readItems:()=>[{quantity:2,price:100,discountPercent:10}],
    activeId:()=>projects[1].id,
    get:id=>projects.find(project=>project.id===id)||null,
    create:input=>{state.projectInput=input;return projects[0]},duplicate:()=>null,remove(){},open(){},projectUrl:id=>`project.html?project=${id}`
  };
  const customers=[{id:'cus_aselsan',companyName:'ASELSAN',contact:'',phone:'',email:'',taxOffice:'Kurumlar',taxNo:'123',address:'Ankara'}];
  const customerStore={
    list:()=>customers,
    findByName:name=>customers.find(customer=>customer.companyName.toLocaleLowerCase('tr-TR')===String(name||'').trim().toLocaleLowerCase('tr-TR'))||null,
    upsert:input=>{state.customerInput=input;Object.assign(customers[0],input);return customers[0]}
  };
  const document={body:{style:{}},getElementById:id=>elements[id]||null,addEventListener(){}};
  const window={VensisProjects:store,VensisCustomers:customerStore,VensisProjectListUtils:listUtils,addEventListener(){}};
  const context={window,document,Intl,Date,Number,String,Array,Math,Object,Boolean,URLSearchParams,location:{assign:value=>{state.assigned=value}},confirm:()=>true,setTimeout:fn=>fn()};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/projects.js'),'utf8'),context);
  elements.__state=state;
  return elements;
}

test('dashboard renders project code/date and newest project first',()=>{
  const elements=dashboard();
  const html=elements.projectsGrid.innerHTML;
  assert.ok(html.indexOf('Hangar Projesi')<html.indexOf('Aydınlatma'));
  assert.ok(html.indexOf('Aydınlatma')<html.indexOf('Eski Proje'));
  assert.match(html,/PRJ-20260811-DEF456/);
  assert.match(html,/Project Date/);
});

test('dashboard search and month controls filter rendered cards',()=>{
  const elements=dashboard();
  elements.projectSearch.value='tusas';
  elements.projectSearch.listeners.input();
  assert.match(elements.projectsGrid.innerHTML,/Hangar Projesi/);
  assert.doesNotMatch(elements.projectsGrid.innerHTML,/Aydınlatma|Eski Proje/);
  assert.equal(elements.projectCount.textContent,'1');
  assert.equal(elements.totalUnits.textContent,'2');
  assert.equal(elements.combinedValue.textContent,'€180,00');

  elements.projectSearch.value='';
  elements.projectMonth.value='2026-07';
  elements.projectMonth.listeners.change();
  assert.match(elements.projectsGrid.innerHTML,/Aydınlatma/);
  assert.doesNotMatch(elements.projectsGrid.innerHTML,/Hangar Projesi|Eski Proje/);
  assert.equal(elements.projectCount.textContent,'1');
  assert.equal(elements.totalUnits.textContent,'2');
  assert.equal(elements.combinedValue.textContent,'€180,00');
});

test('new projects require a complete customer and save missing details before creation',()=>{
  const elements=dashboard();
  elements.newProjectName.value='Yeni Hangar';
  elements.newProjectReference.value='ASELSAN';
  elements.newProjectReference.listeners.input();
  elements.projectForm.listeners.submit({preventDefault(){}});
  assert.equal(elements.__state.projectInput,null);
  assert.equal(elements.projectFormError.classList.contains('is-visible'),true);
  assert.equal(elements.newProjectContact.focused,true);

  elements.newProjectContact.value='Ayşe Hanım';
  elements.newProjectPhone.value='0312 000 00 00';
  elements.projectForm.listeners.submit({preventDefault(){}});
  assert.equal(elements.__state.customerInput.companyName,'ASELSAN');
  assert.equal(elements.__state.customerInput.contact,'Ayşe Hanım');
  assert.equal(elements.__state.customerInput.phone,'0312 000 00 00');
  assert.equal(elements.__state.customerInput.taxOffice,'Kurumlar');
  assert.equal(elements.__state.projectInput.name,'Yeni Hangar');
  assert.equal(elements.__state.projectInput.reference,'ASELSAN');
  assert.equal(elements.__state.projectInput.contact,'Ayşe Hanım');
  assert.match(elements.__state.assigned,/project\.html\?project=/);
});
