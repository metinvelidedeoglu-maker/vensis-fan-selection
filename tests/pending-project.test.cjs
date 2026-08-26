const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('pending project transfer stores products and opens the required project form',()=>{
  const memory=new Map();
  const sessionStorage={
    getItem:key=>memory.has(key)?memory.get(key):null,
    setItem:(key,value)=>memory.set(key,String(value)),
    removeItem:key=>memory.delete(key)
  };
  const location={pathname:'/electrical/index.html',assigned:'',assign(value){this.assigned=value}};
  const window={VensisAccess:{storageKey:key=>`guest:${key}`}};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname,'../js/pending-project.js'),'utf8'),
    {window,sessionStorage,location,JSON,String,Array,Number,Math,Date}
  );

  assert.equal(window.VensisPendingProject.open([{model:'EL-01',quantity:0}],'electrical-catalog'),true);
  assert.equal(location.assigned,'../projects.html?new=1');
  assert.equal(window.VensisPendingProject.read().items[0].quantity,1);
  assert.equal(window.VensisPendingProject.read().source,'electrical-catalog');

  window.VensisPendingProject.clear();
  assert.equal(window.VensisPendingProject.read(),null);
});
