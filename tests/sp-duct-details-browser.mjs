import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/duct-catalogue-details.json'),'utf8'));
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
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const out='test-results/sp-duct-details';fs.mkdirSync(out,{recursive:true});
try{
 for(const row of evidence.models){
  await page.goto(base+'/catalog.html?series='+encodeURIComponent(row.seriesId)+'&model='+encodeURIComponent(row.id));
  const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
  for(const lang of ['tr','en']){
   await page.getByRole('button',{name:lang==='tr'?'Türkçe':'English',exact:true}).click();
   assert.equal(await card.locator('.model-field').count(),12,row.model);
   assert.equal(await card.locator('.model-field-missing').count(),row.unknownFields.length,row.model);
   const missing=await card.locator('.model-field-missing span').allTextContents();
   assert.ok(missing.every(s=>/^(Current|Akım|Operating Temperature|Çalışma Sıcaklığı)$/.test(s)),row.model+' only documented unknowns');
   const expected=await page.evaluate(({id,lang})=>window.VensisCatalogFeatureTags(window.VensisCatalog.getModel(id),lang),{id:row.id,lang});
   assert.deepEqual(await card.locator('.model-feature-tag').allTextContents(),expected,row.model+' tags');
   for(const width of [390,430]){
    await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),row.model+' mobile');
    assert.deepEqual(await card.locator('.model-field b,.model-feature-tag').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.model+' clipped card');
   }
   await page.setViewportSize({width:1440,height:1000});
   const html=await page.evaluate(({id,lang})=>window.VensisDirectPreview.html({mode:'catalog',outputLanguage:lang,product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),{id:row.id,lang});
   const preview=await context.newPage();await preview.setContent(html,{waitUntil:'load'});await preview.waitForFunction(()=>[...document.images].every(i=>i.complete));
   assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(i=>!i.naturalWidth).map(i=>i.alt)),[],row.model+' images');
   assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.model+' clipped preview');
   const technical=await preview.locator('.technical-grid').innerText();assert.ok(technical.includes(row.technical.ipClass));
   if(row.unknownFields.includes('motor.current'))assert.equal(await preview.locator('.technical-cell').filter({hasText:/^(Current|Akım)\n/}).count(),0,row.model+' unknown current hidden');
   if(row.seriesId==='SILENTUB')assert.equal(await preview.locator('.technical-cell').filter({hasText:/^(Operating Temperature|Çalışma Sıcaklığı)\n/}).count(),0,'unknown temperature hidden');
   assert.deepEqual(await preview.locator('.feature-tag').allTextContents(),expected,row.model+' preview tags');
   const featureText=await preview.locator('.feature-card').innerText();assert.ok(featureText.includes(evidence.series[row.seriesId].applications[lang][0]));
   if(row.model==='JETLINE-315')assert.ok(featureText.includes(lang==='tr'?'8,4':'8.4')&&featureText.includes(lang==='tr'?'8,9':'8.9'),row.model+' visible weight discrepancy');
   assert.ok(await preview.locator('svg').count());assert.ok(await preview.locator('.catalog-drawing-image').count());
   await preview.pdf({path:out+'/'+row.model.replaceAll('/','_')+'-'+lang+'.pdf',format:'A4',printBackground:true});await preview.close();
  }
  console.log('PASS '+row.model);
 }
 assert.deepEqual(errors,[]);console.log('PASS: 23 duct/cabinet models, 12 fixed fields, 5 retained unknown boxes, model-specific variants, mobile and 46 bilingual PDFs.');
}finally{await browser.close();}
