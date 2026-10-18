const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function harness(query=''){
  const nodes=[];
  const element=tag=>{const node={tag,children:[],style:{},dataset:{},setAttribute(k,v){this[k]=v;},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;},querySelector(){return null;},querySelectorAll(){return [];},after(){}};nodes.push(node);return node;};
  const layout=element('div');layout.id='catalogLayout';
  const detail=element('div');detail.id='detailPage';
  const document={head:element('head'),documentElement:{lang:'en'},createElement:element,getElementById:id=>nodes.find(n=>n.id===id),querySelector:()=>null};
  const location=new URL('https://select.vensis.com.tr/catalog.html'+query);
  const window={addEventListener(){}};
  const context={window,document,location,URL,URLSearchParams};
  for(const file of ['data/ventilation-catalog.js','products/ventilation.js','js/ventilation-routes.js'])vm.runInNewContext(read(file),context);
  return {window,document,nodes};
}
test('every product has a unique route, including repeated model names',()=>{
  const {window:w}=harness(),C=w.VensisCatalog,seen=new Set();
  for(const model of C.models){
    const url=w.VensisVentilationRoutes.url(C.getSeries(model.seriesId),model);
    assert.ok(!seen.has(url),model.id);seen.add(url);
  }
  assert.equal(seen.size,1022);
});
test('same route builder handles every manufacturer and retains project navigation context',()=>{
  const {window:w}=harness('?project=existing-project&return=project');
  for(const b of w.VensisCatalog.brands){
    const s=w.VensisCatalog.series.find(s=>s.manufacturer===b.name),m=w.VensisCatalog.modelsForSeries(s.id)[0];
    const url=new URL(w.VensisVentilationRoutes.navigationUrl(s,m));
    assert.ok(url.pathname.startsWith('/en/fan/'+b.slug+'/'));
    assert.equal(url.searchParams.get('project'),'existing-project');
    assert.equal(url.searchParams.get('return'),'project');
    assert.equal(new URL(w.VensisVentilationRoutes.url(s,m)).search,'');
  }
});
test('unknown brands, series and models are noindex with an explicit empty result',()=>{
  for(const query of ['?brand=not-a-brand','?series=not-a-series','?brand=vitlo&series=axf&model=not-a-model']){
    const {document,nodes}=harness(query);
    assert.equal(nodes.find(n=>n.name==='robots').content,'noindex,follow');
    assert.equal(document.getElementById('catalogLayout').hidden,true);
    assert.equal(document.getElementById('detailPage').children[0].textContent,'Product or series not found.');
  }
});
test('known product URLs publish the product identity in canonical and language links',()=>{
  const {window:w,nodes}=harness('?brand=vortice&series=ca-md-extra-eu&model=ca-100-md-extra-eu');
  const canonical=nodes.find(n=>n.rel==='canonical').href;
  assert.ok(canonical.includes('/en/fan/vortice/ca-md-extra-eu/'));
  assert.equal(nodes.find(n=>n.name==='robots').content,'index,follow,max-image-preview:large');
  const schema=JSON.parse(nodes.find(n=>n.id==='vensisVentilationJsonLd').textContent);
  assert.equal(schema['@type'],'Product');assert.equal(schema.name,'CA 100 MD EXTRA EU');
  assert.equal(nodes.find(n=>n.hreflang==='tr').href,canonical.replace('/en/','/tr/'));
  assert.ok(w.VensisVentilationRoutes);
});
