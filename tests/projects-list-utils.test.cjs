const test=require('node:test');
const assert=require('node:assert/strict');
const utils=require('../js/projects-list-utils.js');

const projects=[
  {id:'prj_old_abc123',name:'Havalandırma Revizyonu',reference:'ASELSAN',createdAt:'2026-06-02T09:00:00Z'},
  {id:'prj_new_def456',name:'Hangar Projesi',reference:'TUSAŞ',createdAt:'2026-08-11T14:00:00Z'},
  {id:'prj_mid_ghi789',name:'Aydınlatma',reference:'Roketsan',createdAt:'2026-07-22T08:30:00Z'}
];

test('projects are sorted by creation date, newest first',()=>{
  assert.deepEqual(utils.filterAndSort(projects).map(project=>project.id),[
    'prj_new_def456','prj_mid_ghi789','prj_old_abc123'
  ]);
});

test('month filter uses the project creation month',()=>{
  assert.deepEqual(utils.filterAndSort(projects,{month:'2026-07'}).map(project=>project.id),['prj_mid_ghi789']);
  assert.deepEqual(utils.availableMonths(projects),['2026-08','2026-07','2026-06']);
});

test('search matches project and company names with Turkish text normalization',()=>{
  assert.deepEqual(utils.filterAndSort(projects,{query:'hangar'}).map(project=>project.id),['prj_new_def456']);
  assert.deepEqual(utils.filterAndSort(projects,{query:'tusas'}).map(project=>project.id),['prj_new_def456']);
  assert.deepEqual(utils.filterAndSort(projects,{query:'ROKETSAN'}).map(project=>project.id),['prj_mid_ghi789']);
  assert.equal(utils.searchKey('IŞIK'),utils.searchKey('isik'));
});

test('project code is stable and readable',()=>{
  assert.equal(utils.projectCode(projects[1]),'PRJ-20260811-DEF456');
});
