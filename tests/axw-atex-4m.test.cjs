const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadModel(){
  const context={window:{models:[]}};
  vm.createContext(context);
  vm.runInContext(read('data/fans-18.js'),context,{filename:'data/fans-18.js'});
  return context.window.models.find(row=>row.model==='AXW/ATEX 50-4M-0.75');
}

test('AXW/ATEX 50-4M monophase model keeps the confirmed base performance',()=>{
  const row=loadModel();
  assert.ok(row);
  assert.equal(row.model,'AXW/ATEX 50-4M-0.75');
  assert.equal(row.series,'AXW/ATEX');
  assert.equal(row.brand,'Vitlo');
  assert.equal(row.nominal,8920);
  assert.equal(row.kw,0.55);
  assert.equal(row.rpm,1410);
  assert.equal(row.amps,1.5);
  assert.equal(row.spl,76);
  assert.equal(row.pole,4);
  assert.equal(row.phase,'Single-phase');
});

test('AXW/ATEX 50-4M uses 230V and the user-confirmed EUR price',()=>{
  const row=loadModel();
  assert.equal(row.voltage,'230V-50Hz');
  assert.equal(row.price,1725);
  assert.equal(row.priceCurrency,'EUR');
});

test('AXW/ATEX 50-4M inherits the 4T performance curve',()=>{
  const row=loadModel();
  assert.deepEqual(
    Array.from(row.sourcePoints,point=>Array.from(point)),
    [[0,8920],[25,8450],[50,7950],[75,7400],[100,6750],[125,6000],[150,4240]]
  );
});

test('AXW/ATEX 50-4M contains English catalog metadata',()=>{
  const row=loadModel();
  assert.equal(row.catalogNameEn,'AXW/ATEX Axial Wall-Mounted Explosion-Proof Fans');
  assert.equal(row.fanTypeEn,'Axial');
  assert.equal(row.mountTypeEn,'Wall-Mounted');
  assert.equal(row.productGroupEn,'Explosion-Proof Fan');
  assert.ok(row.catalogueInfo.general.some(text=>text.includes('single-phase')));
  assert.ok(row.catalogueInfo.general.some(text=>text.includes('230V-50Hz')));
});

test('Vitlo catalog loader and fan sitemap automatically include fans-18',()=>{
  const overrides=read('data/series-overrides.js');
  const sitemap=read('sitemap-fans.php');
  assert.match(overrides,/data\/fans-18\.js\?v=20260908-axw-atex-4m-r1/);
  assert.match(sitemap,/glob\(__DIR__\s*\.\s*'\/data\/fans-\*\.js'\)/);
});
