import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/bath-verified-curves.json'),'utf8'));
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
const page=await context.newPage(),errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
const out='test-results/sp-bath-curves';fs.mkdirSync(out,{recursive:true});
try{
 for(const row of evidence.models){
  const series=row.family.startsWith('SILENT')?'SILENT':'EDM',g=evidence.graphs[row.family];
  await page.goto(base+'/catalog.html?series='+series+'&model='+encodeURIComponent(row.id));
  const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
  for(const lang of ['tr','en']){
   await page.getByRole('button',{name:lang==='tr'?'Türkçe':'English',exact:true}).click();
   assert.equal(await card.locator('.model-field').count(),12,row.model);
   assert.equal(await card.locator('.model-field-missing').count(),1,row.model);
   assert.equal(await card.locator('[data-selection-status="ready"]').count(),1,row.model+' ready');
   assert.equal(await card.locator('[data-selection-status="missing-curve"]').count(),0);
   for(const width of [390,430]){
    await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),row.model+' mobile');
   }
   await page.setViewportSize({width:1440,height:1000});
   const html=await page.evaluate(({id,lang})=>window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),{id:row.id,lang});
   const preview=await context.newPage();await preview.setContent(html,{waitUntil:'load'});await preview.waitForFunction(()=>[...document.images].every(i=>i.complete));
   assert.deepEqual(await preview.locator('img').evaluateAll(nodes=>nodes.filter(i=>!i.naturalWidth).map(i=>i.alt)),[],row.model+' images');
   assert.equal(await preview.locator('.technical-cell').filter({hasText:/^(Current|Akım)\n/}).count(),0,'unknown current hidden');
   const curve=preview.locator('.curve svg path');assert.equal(await curve.count(),1);
   const d=await curve.getAttribute('d');assert.ok(!/NaN|Infinity/.test(d));assert.equal((d.match(/[ML]/g)||[]).length,g.sourcePoints.length,'all source vertices drawn in order');
   assert.ok(await preview.locator('.catalog-drawing-image').count());
   assert.equal(await preview.locator('.dimension-panel.no-values').count(),1,'original dimensioned drawing retained without an invented table');
   assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],'preview values fit');
   await preview.pdf({path:out+'/'+row.model+'-'+lang+'.pdf',format:'A4',printBackground:true});
   if(lang==='tr'&&['EDM-100','EDM-200','SILENT-100 CZ','SILENT-300 CZ'].includes(row.model))await preview.screenshot({path:out+'/'+row.model+'-preview.png',fullPage:true});
   await preview.close();
  }
  console.log('PASS curve/card/print '+row.model);
 }
 await page.goto(base+'/fan-selection.html');await page.waitForFunction(()=>Boolean(window.VensisSelection&&window.VensisDirectPreview));
 for(const row of evidence.models){
  const g=evidence.graphs[row.family],sample=g.sourcePoints[Math.floor(g.sourcePoints.length/2)];
  const result=await page.evaluate(({id,sample,domain})=>{
   const put=(q,p)=>{for(const [key,value] of Object.entries({q,p,qmin:0,qmax:0,pmin:0,pmax:0}))document.getElementById(key).value=value;return window.VensisSelection.select().results;};
   const on=put(sample[1],sample[0]).find(m=>m.productKey===id);
   if(!on)return {on:false};
   const html=window.VensisDirectPreview.html({mode:'selection',outputLanguage:'tr',model:on,required:{q:sample[1],p:sample[0]},selected:{q:on.qq,p:on.pp}});
   const outside=put(domain.flowMax+10,1).some(m=>m.productKey===id);
   return {on:true,q:on.qq,p:on.pp,mode:on.matchMode,outside,html};
  },{id:row.id,sample,domain:g.domain});
  assert.ok(result.on,row.model+' selectable');assert.equal(result.mode,'system-intersection');assert.ok(Math.abs(result.q-sample[1])<1e-5&&Math.abs(result.p-sample[0])<1e-5);assert.equal(result.outside,false,'no extrapolation');
  assert.ok(result.html.includes('<svg')&&!result.html.includes('<span>Akım</span>'));
 }
 assert.deepEqual(errors,[]);console.log('PASS: 10 source-verified bath-fan curves, real selection and no extrapolation, 12-field mobile cards and 20 bilingual PDFs.');
}finally{await browser.close();}
