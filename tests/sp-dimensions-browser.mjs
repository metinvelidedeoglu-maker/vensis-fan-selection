// S&P source drawings, model tables and complete single-page PDF checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.VENSIS_TEST_URL||'http://127.0.0.1:8123';
const out=process.env.VENSIS_PREVIEW_DIR||'test-results/sp-dimensions';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');});
// Optional in-process static fixture avoids requiring a local PHP listener.
if(process.env.VENSIS_TEST_LOCAL==='1'){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 await context.route(base+'/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname),file=path.join(root,pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Not found'});
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  await route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime});
 });
}
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/catalog.html?brand=soler-palau');
 await page.waitForFunction(()=>window.VensisCatalog?.models.length===1022);
 assert.equal(await page.locator('.series-card').count(),28);
 const labels=await page.locator('.series-card h2').allTextContents();assert.deepEqual(labels,[...labels].sort(new Intl.Collator('tr',{sensitivity:'base',numeric:true}).compare));
 const ids=await page.evaluate(()=>{const C=window.VensisCatalog,s=new Set(C.series.filter(s=>s.manufacturer==='Soler & Palau').map(s=>s.id));return C.models.filter(m=>s.has(m.seriesId)).map(m=>m.id);});
 assert.equal(ids.length,163);const seen=new Set(),report=[];
 const preview=await context.newPage();preview.on('pageerror',e=>errors.push(e.message));
 for(const id of ids){
  const {html,model,asset,values}=await page.evaluate(id=>{const C=window.VensisCatalog,m=C.getModel(id);return {html:window.VensisDirectPreview.html({product:C.product(id),model:m,language:'tr'}),model:m.model,asset:m.media.dimensionImage,values:m.dimensions.headers.length};},id);
  await preview.setViewportSize({width:1440,height:1000});await preview.setContent(html,{waitUntil:'load'});
  await preview.locator('[data-original-catalog-drawing] img').evaluate(img=>img.decode());
  assert.equal(await preview.locator('[data-original-catalog-drawing] img').evaluate(img=>img.complete&&img.naturalWidth>0),true,id);
  assert.equal(await preview.locator('.dimension-table').count(),values?1:0,id);
  const heights=await preview.locator('.dimension-table tbody tr').evaluateAll(rows=>rows.map(r=>r.getBoundingClientRect().height));assert.ok(heights.every(h=>h<35),id);
  const name=model.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
  await preview.pdf({path:out+'/'+name+'.pdf',format:'A4',printBackground:true});
  if(!seen.has(asset)){
   await preview.screenshot({path:out+'/'+name+'.png',fullPage:true});
   await preview.setViewportSize({width:390,height:844});assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'mobile overflow '+id);
   await preview.screenshot({path:out+'/'+name+'-mobile.png',fullPage:true});seen.add(asset);
  }
  report.push({id,model,asset,values,pdf:name+'.pdf'});
  if(report.length%30===0)console.log('Verified models:',report.length);
 }
 await preview.close();assert.equal(seen.size,44);assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 console.log('PASS: 28 S&P series, 163 model PDFs, 44 original drawing variants, alphabetic order and mobile layouts.');
}finally{await browser.close();}
