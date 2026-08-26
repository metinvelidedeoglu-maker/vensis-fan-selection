const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('customer data stays browser-local until the secure edit session is authenticated',()=>{
  const html=read('customers.html');
  const store=read('js/customers-store.js');

  assert.doesNotMatch(html,/customers-faz1/i);
  assert.doesNotMatch(store,/VENSIS_FAZ1_CUSTOMERS?/);
  assert.match(store,/const KEY='vensis_customers_v2'/);
  assert.match(store,/const LEGACY_KEY='vensis_customers_v1'/);
  assert.match(store,/api\/edit\/session\.php/);
  assert.match(store,/payload\.authenticated/);
  assert.match(store,/if\(!cloud\.authenticated\)return/);
});

test('customer cloud endpoints require the secure session and CSRF on writes',()=>{
  const bootstrap=read('api/customers/bootstrap.php');
  const list=read('api/customers/list.php');
  const sync=read('api/customers/sync.php');

  assert.match(bootstrap,/edit_require_session\(\$config\)/);
  assert.match(bootstrap,/edit_require_persistent_config\(\$config\)/);
  assert.match(list,/customer_api_authorize\('GET'\)/);
  assert.match(sync,/customer_api_authorize\('POST', true\)/);
  assert.match(sync,/edit_request_json/);
});

test('technical datasheets no longer render an Applications box or test label',()=>{
  const datasheet=read('js/ui/datasheet.js');
  const detail=read('detail.html');
  const projectPrint=read('project-print.html');
  const fanData=read('data/fans-01.js');
  const overrides=read('data/series-overrides.js');

  assert.doesNotMatch(datasheet,/<h3>Applications<\/h3>/);
  assert.match(datasheet,/<h3>General Features<\/h3>/);
  assert.doesNotMatch(detail,/suite-sidebar\.js/);
  assert.match(projectPrint,/\.bottom-grid\{display:block/);
  assert.doesNotMatch(fanData,/deneme/i);
  assert.doesNotMatch(overrides,/deneme/i);
});

test('all primary app entry points load the shared language layer',()=>{
  const direct=['index.html','fan-selection.html','catalog.html','catalog-hub.html','customers.html','electrical/index.html','detail.html','project-print.html'];
  for(const file of direct)assert.match(read(file),/js\/language\.js/,file);

  const viaOrderUtils=['projects.html','project.html','quotation.html','order.html'];
  for(const file of viaOrderUtils)assert.match(read(file),/js\/order-utils\.js/,file);
  assert.match(read('js/order-utils.js'),/js\/language\.js/);
});

test('the overview dashboard and refreshed global header are wired',()=>{
  const home=read('index.html');
  const header=read('js/suite-shell.js');
  const selection=read('fan-selection.html');

  assert.match(home,/Workspace at a glance/);
  assert.match(home,/js\/home\.js/);
  assert.match(home,/href="fan-selection\.html"/);
  assert.match(selection,/id="q"/);
  assert.match(header,/href="\$\{base\}index\.html">\$\{tr\('Overview'\)\}/);
  assert.match(header,/href="\$\{base\}fan-selection\.html">Fan Selection/);
  assert.match(header,/background:#0b282b/);
});
