import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/products/soler-palau/four-catalogue-details.json'),'utf8'));
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
await context.addInitScript(()=>{
  if(location.origin==='null')return;
  localStorage.setItem('vensis_access_mode_v1','guest');localStorage.setItem('vensis_language_v1','tr');
});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const out='test-results/sp-four-catalogue-details';fs.mkdirSync(out,{recursive:true});
try{
  for(const row of evidence.models){
    await page.goto(base+'/catalog.html?series='+encodeURIComponent(row.seriesId)+'&model='+encodeURIComponent(row.id));
    const card=page.locator('.model-card:not([hidden])');await card.locator('.vensis-preview-classic').waitFor();
    await page.waitForFunction(()=>Boolean(window.VensisDatasheet?.__noCurrentPolicy));
    assert.equal(await card.locator('.model-field').count(),12,row.model);
    assert.equal(await card.locator('.model-field-missing').count(),0,row.model);
    assert.equal(await card.locator('.model-field').filter({hasText:/^Max\. Airflow/}).locator('b').innerText(),row.sourceMaxAirflow.toLocaleString('en-US')+' m³/h',row.model+' source maximum');
    assert.equal(await card.locator('.model-field').filter({hasText:/^Devir/}).locator('b').innerText(),row.motor.speed.toLocaleString('en-US')+' rpm',row.model);
    assert.equal(await card.locator('.model-field').filter({hasText:/^Faz/}).locator('b').innerText(),({'Single-phase':'Monofaze','Three-phase':'Trifaze'}[row.technical.phase]||row.technical.phase),row.model);
    assert.equal(await card.locator('.model-feature-tag').filter({hasText:/^ATEX$/}).count(),row.technical.atex?1:0,row.model);
    assert.equal(await card.locator('[data-selection-status]').getAttribute('data-selection-status'),row.seriesId==='HV-STYLVENT'?'missing-curve':'ready',row.model);
    for(const width of [390,430]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),row.model+' mobile overflow');
    }
    await page.getByRole('button',{name:'English',exact:true}).click();
    assert.equal(await card.locator('.model-field').filter({hasText:/^Speed/}).locator('b').innerText(),row.motor.speed.toLocaleString('en-US')+' rpm',row.model+' EN');
    await page.getByRole('button',{name:'Türkçe',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
    const html=await page.evaluate(id=>window.VensisDirectPreview.html({mode:'catalog',product:window.VensisCatalog.product(id),model:window.VensisCatalog.getModel(id)}),row.id);
    const preview=await context.newPage();await preview.setContent(html,{waitUntil:'networkidle'});
    await preview.waitForFunction(()=>[...document.images].every(img=>img.complete));
    assert.equal(await preview.locator('.technical-cell').filter({hasText:/^Devir/}).locator('b').innerText(),row.motor.speed.toLocaleString('tr-TR')+' rpm',row.model+' preview');
    assert.deepEqual(await preview.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).map(img=>img.src)),[],row.model+' images');
    assert.deepEqual(await preview.locator('.technical-cell b').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)),[],row.model+' clipped values');
    assert.equal(await preview.locator('.feature-tag').filter({hasText:/^ATEX$/}).count(),row.technical.atex?1:0,row.model+' preview ATEX');
    if(row.technical.atex)assert.ok(await preview.locator('.feature-warning').innerText(),row.model+' safety');
    assert.ok(await preview.locator('.catalog-drawing-image').count(),row.model+' drawing');
    await preview.pdf({path:out+'/'+row.model.replaceAll('/','-')+'.pdf',format:'A4',printBackground:true});
    if(['HDT/4-315','HV-150 AE','HXTR/4-560','ILT/4-315 EX'].includes(row.model))await preview.screenshot({path:out+'/'+row.model.replaceAll('/','-')+'.png',fullPage:true});
    await preview.close();console.log('PASS '+row.model);
  }
  assert.deepEqual(errors,[]);console.log('PASS: all 16 source-completed S&P models, 12 filled boxes, TR/EN, 390/430px, ATEX, previews and PDFs.');
}finally{await browser.close();}
