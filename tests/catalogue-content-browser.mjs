import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const audit=JSON.parse(read('assets/products/catalogue-content-details.json'));
const dataContext={window:{}};vm.runInNewContext(read('data/ventilation-catalog.js'),dataContext);
const data=dataContext.window.VensisVentilationData;
const ids=new Set();
// Long model names in every source-covered series, plus all explicit exceptions.
for(const sid of Object.keys(audit.series)){
 const models=audit.models.filter(x=>x.seriesId===sid).map(x=>data.models.find(m=>m.id===x.id));
 models.sort((a,b)=>b.model.length-a.model.length);ids.add(models[0].id);
}
for(const id of Object.keys(audit.modelPatches))ids.add(id);
for(const row of audit.models.filter(x=>['VORTICE VARIO','VORTICE VARIO I'].includes(x.seriesId)))ids.add(row.id);
ids.add('VORTICE-ROOF|15301');ids.add('VORTICE-ROOF|15267');
const rows=[...ids].map(id=>data.models.find(m=>m.id===id));
const base=process.env.VENSIS_TEST_URL||'http://vensis.test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
if(!process.env.VENSIS_TEST_URL)await context.route('**/*',async route=>{
 const url=new URL(route.request().url());if(url.hostname!=='vensis.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Not found'});
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
 return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime});
});
await context.addInitScript(()=>{if(location.origin==='null')return;localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');});
const page=await context.newPage(),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
const out='test-results/catalogue-content';fs.mkdirSync(out,{recursive:true});
try{
 for(let i=0;i<rows.length;i++){
  const row=rows[i];await page.goto(base+'/catalog.html?series='+encodeURIComponent(row.seriesId)+'&model='+encodeURIComponent(row.id));
  await page.locator('.model-card:not([hidden]) .vensis-preview-classic').waitFor();
  await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
  for(const lang of ['tr','en']){
   await page.getByRole('button',{name:lang==='tr'?'Türkçe':'English',exact:true}).click();
   const card=page.locator('.model-card:not([hidden])');
   assert.equal(await card.locator('.model-field').count(),12,row.id);
   const expected=await page.evaluate(({id,lang})=>window.VensisCatalogFeatureTags(window.VensisCatalog.getModel(id),lang),{id:row.id,lang});
   assert.deepEqual(await card.locator('.model-feature-tag').allTextContents(),expected,row.id+' '+lang+' tags');
   const upper=await page.locator('[data-product-features]').innerText();
   if(lang==='tr')assert.ok(upper.includes('Genel Özellikler'),row.id);
   const description=row.description||data.series.find(s=>s.id===row.seriesId).description;
   const first=description.general[0],translated=data.contentTranslations[first];
   if(translated)assert.ok(upper.includes(lang==='tr'?translated:first),row.id+' '+lang+' upper copy');
   for(const width of [390,430]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),row.id+' mobile');
    assert.deepEqual(await card.locator('.model-feature-tag').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.id+' clipped tag');
   }
   await page.setViewportSize({width:1440,height:1000});
   const html=await page.evaluate(({id,lang})=>window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),{id:row.id,lang});
   const preview=await context.newPage();await preview.setContent(html,{waitUntil:'load'});
   await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
   assert.deepEqual(await preview.locator('.feature-tag').allTextContents(),expected,row.id+' '+lang+' preview tags');
   assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src)),[],row.id+' images');
   assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.id+' values');
   await preview.pdf({path:out+'/'+String(i).padStart(2,'0')+'-'+row.seriesId.replaceAll('/','-')+'-'+lang+'.pdf',format:'A4',printBackground:true});
   await preview.close();
  }
  console.log('PASS '+row.model);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/coverage.json',JSON.stringify({models:rows.map(r=>({id:r.id,model:r.model,seriesId:r.seriesId})),pdfs:rows.length*2},null,2));
 console.log('PASS: '+rows.length+' representative/exception models, '+rows.length*2+' TR/EN PDFs, 46 series, 390/430px cards.');
}finally{await browser.close();}
