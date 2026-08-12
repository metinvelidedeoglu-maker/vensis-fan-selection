const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const listUtils=require('../js/projects-list-utils.js');

function dashboard(){
  const ids=['projectCount','totalUnits','combinedValue','projectsToolbar','projectsEmpty','projectsNoResults','projectsGrid','filterSummary','projectSearch','projectMonth','clearProjectFilters','newProject','emptyNewProject','cancelProject','projectModal','projectForm','newProjectName','newProjectReference','newProjectContact'];
  const elements=Object.fromEntries(ids.map(id=>[id,{
    id,value:'',hidden:false,textContent:'',innerHTML:'',style:{},listeners:{},
    addEventListener(type,listener){this.listeners[type]=listener},focus(){},reset(){}
  }]));
  const projects=[
    {id:'prj_old_abc123',name:'Eski Proje',reference:'ASELSAN',createdAt:'2026-06-02T09:00:00Z',updatedAt:'2026-08-12T08:00:00Z'},
    {id:'prj_new_def456',name:'Hangar Projesi',reference:'TUSAŞ',createdAt:'2026-08-11T14:00:00Z',updatedAt:'2026-08-11T14:00:00Z'},
    {id:'prj_mid_ghi789',name:'Aydınlatma',reference:'Roketsan',createdAt:'2026-07-22T08:30:00Z',updatedAt:'2026-07-22T08:30:00Z'}
  ];
  const store={
    list:()=>projects,
    readMeta:id=>projects.find(project=>project.id===id)||{},
    readItems:()=>[{quantity:2,price:100,discountPercent:10}],
    activeId:()=>projects[1].id,
    get:id=>projects.find(project=>project.id===id)||null,
    create:()=>projects[0],duplicate:()=>null,remove(){},open(){},projectUrl:id=>`project.html?project=${id}`
  };
  const document={body:{style:{}},getElementById:id=>elements[id]||null,addEventListener(){}};
  const window={VensisProjects:store,VensisProjectListUtils:listUtils,addEventListener(){}};
  const context={window,document,Intl,Date,Number,String,Array,Math,Object,Boolean,URLSearchParams,location:{assign(){}},confirm:()=>true,setTimeout:fn=>fn()};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/projects.js'),'utf8'),context);
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
