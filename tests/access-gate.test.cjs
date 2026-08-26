const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('primary application pages load the access gate before workspace stores',()=>{
  const rootPages=['index.html','fan-selection.html','catalog-hub.html','catalog.html','projects.html','project.html','customers.html','quotation.html','order.html','project-print.html','detail.html'];
  for(const file of rootPages){
    const html=read(file);
    assert.match(html,/css\/access-gate\.css\?v=20260826-access-gate-r1/,file);
    assert.match(html,/js\/access-gate\.js\?v=20260826-access-gate-r1/,file);
    const gate=html.indexOf('js/access-gate.js');
    const store=html.indexOf('js/projects-store.js');
    if(store>=0)assert.ok(gate>=0&&gate<store,`${file}: access gate must load before project storage`);
  }

  const electrical=read('electrical/index.html');
  assert.match(electrical,/\.\.\/css\/access-gate\.css\?v=20260826-access-gate-r1/);
  assert.match(electrical,/\.\.\/js\/access-gate\.js\?v=20260826-access-gate-r1/);
  assert.ok(electrical.indexOf('../js/access-gate.js')<electrical.indexOf('../js/projects-store.js'));
});

test('access gate offers password and guest entry using the secure server session',()=>{
  const gate=read('js/access-gate.js');
  assert.match(gate,/Şifreyle Giriş/);
  assert.match(gate,/Misafir Olarak Devam Et/);
  assert.match(gate,/session\.php/);
  assert.match(gate,/login\.php/);
  assert.match(gate,/logout\.php/);
  assert.match(gate,/credentials:'same-origin'/);
  assert.match(gate,/storageKey/);
  assert.doesNotMatch(gate,/password\s*[:=]\s*['"][^'"]+['"]/i);
});

test('guest projects, customers and document drafts are isolated from secure browser records',()=>{
  const projects=read('js/projects-store.js');
  const customers=read('js/customers-store.js');
  assert.match(projects,/GUEST_MODE/);
  assert.match(projects,/key\.replace\(\/\^vensis_\//);
  assert.match(projects,/if\(GUEST_MODE\)\{setCloudStatus\('local','Guest/);
  assert.match(customers,/GUEST_MODE/);
  assert.match(customers,/if\(GUEST_MODE\)\{setCloudStatus\('local','Guest/);

  for(const file of ['js/project.js','js/quotation.js','js/quotation-settings.js','js/order-flow.js','js/project-print-action.js','js/project-print.js']){
    assert.match(read(file),/VensisAccess\?\.storageKey/,file);
  }
});

test('header cloud status opens the account and access panel',()=>{
  const shell=read('js/suite-shell.js');
  assert.match(shell,/<button class="suite-cloud"/);
  assert.match(shell,/vensis-open-access-panel/);
});
